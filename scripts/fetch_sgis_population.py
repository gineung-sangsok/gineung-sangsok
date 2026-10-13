"""SGIS API로 임실군 읍면별 총인구·65세 이상 인구를 data/raw/에 저장한다.

실행: uv run python scripts/fetch_sgis_population.py
필요: .env의 SGIS_CONSUMER_KEY, SGIS_CONSUMER_SECRET,
      SGIS_65_PLUS_AGE_TYPE (SGIS 인구통계의 '65세 이상' 연령타입 코드)

SGIS는 행정리 단위 인구를 제공하지 않는다. 이 파일은 읍면별 원자료다.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

API_BASE = "https://sgisapi.mods.go.kr/OpenAPI3"
AUTH_URL = f"{API_BASE}/auth/authentication.json"
TOTAL_POPULATION_URL = f"{API_BASE}/stats/population.json"
AGE_POPULATION_URL = f"{API_BASE}/stats/searchpopulation.json"
IMSIL_ADM_CD = "45750"
IMSIL_NAME_FRAGMENT = "임실"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"


def request_json(url: str, params: dict[str, str]) -> dict[str, Any]:
    request_url = f"{url}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(request_url, timeout=30) as response:
            text = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        sys.exit(f"SGIS HTTP 오류 {error.code}: {detail}")
    except urllib.error.URLError as error:
        sys.exit(f"SGIS 연결 오류: {error.reason}")

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        sys.exit(f"JSON이 아닌 응답(인증키 오류 가능):\n{text[:500]}")
    if str(data.get("errCd", "0")) != "0":
        sys.exit(f"SGIS API 오류: {data.get('errCd')} {data.get('errMsg')}")
    return data


def get_access_token(consumer_key: str, consumer_secret: str) -> str:
    data = request_json(
        AUTH_URL,
        {"consumer_key": consumer_key, "consumer_secret": consumer_secret},
    )
    token = data.get("result", {}).get("accessToken")
    if not token:
        sys.exit("SGIS 응답에 accessToken이 없습니다.")
    return str(token)


def get_population(
    access_token: str,
    *,
    year: str,
    adm_cd: str,
    age_type: str | None = None,
) -> list[dict[str, Any]]:
    params = {"accessToken": access_token, "year": year, "adm_cd": adm_cd, "low_search": "1"}
    if age_type is None:
        data = request_json(TOTAL_POPULATION_URL, params)
    else:
        params["gender"] = "0"
        params["age_type"] = age_type
        data = request_json(AGE_POPULATION_URL, params)
    result = data.get("result")
    if not isinstance(result, list) or not result:
        sys.exit("인구 조회 결과가 없습니다. 기준연도·행정구역 코드·연령타입을 확인하세요.")
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SGIS 임실군 인구 원자료 수집")
    parser.add_argument("--year", default="2020", help="SGIS 기준연도 (기본값: 2020)")
    parser.add_argument("--adm-cd", default=IMSIL_ADM_CD, help="SGIS 5자리 시군구 코드")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    load_dotenv()
    consumer_key = os.getenv("SGIS_CONSUMER_KEY")
    consumer_secret = os.getenv("SGIS_CONSUMER_SECRET")
    age_type = os.getenv("SGIS_65_PLUS_AGE_TYPE")
    if not consumer_key or not consumer_secret:
        sys.exit(".env에 SGIS_CONSUMER_KEY와 SGIS_CONSUMER_SECRET가 필요합니다.")
    if not age_type:
        sys.exit(
            ".env에 SGIS_65_PLUS_AGE_TYPE가 없습니다. SGIS 인구통계 API의 연령타입 코드표에서 "
            "'65세 이상'에 해당하는 값을 확인해 입력하세요. 임의의 코드값을 사용하면 안 됩니다."
        )

    access_token = get_access_token(consumer_key, consumer_secret)
    total_population = get_population(access_token, year=args.year, adm_cd=args.adm_cd)
    population_65_plus = get_population(
        access_token,
        year=args.year,
        adm_cd=args.adm_cd,
        age_type=age_type,
    )
    names = {str(row.get("adm_nm", "")) for row in total_population}
    if not any(IMSIL_NAME_FRAGMENT in name for name in names):
        sys.exit(f"행정구역 코드 {args.adm_cd}의 결과가 임실군 하위 지역이 아닙니다: {sorted(names)}")

    payload = {
        "metadata": {
            "source": "SGIS OpenAPI",
            "year": args.year,
            "request_adm_cd": args.adm_cd,
            "request_level": "시군구의 1단계 하위 행정구역(읍면동)",
            "age_type": age_type,
            "retrieved_at": datetime.now(UTC).isoformat(),
        },
        "total_population": total_population,
        "population_65_plus": population_65_plus,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUT_DIR / f"sgis_population_imsil_{args.year}.json"
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"저장: {output} (읍면동 {len(total_population)}건)")


if __name__ == "__main__":
    main()
