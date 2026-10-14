"""VWorld WFS API로 임실군 법정리 경계를 data/raw/에 저장한다.

실행: uv run python scripts/fetch_vworld_ri.py
필요: .env의 VWORLD_API_KEY
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = BASE_DIR / "data" / "raw"
OUT_FILE = OUT_DIR / "vworld_legal_ri_imsil.geojson"

# 임실군 법정동코드 5자리 (45750). 전북특별자치도 전환 후 변경되었을 수 있으니
# features가 0건이면 52750으로 재시도하거나 VWorld 코드표를 확인할 것.
IMSIL_CODE_PREFIX = "45750"


def main():
    load_dotenv()
    vworld_key = os.getenv("VWORLD_API_KEY")
    if not vworld_key:
        sys.exit("오류: .env 파일에 VWORLD_API_KEY가 설정되어 있지 않습니다.")

    # VWorld WFS API (법정리 경계)
    params = urllib.parse.urlencode({
        "key": vworld_key,
        "service": "WFS",
        "version": "1.1.0",
        "request": "GetFeature",
        "typename": "LT_C_ADRI_INFO",
        "output": "application/json",
        "srsName": "EPSG:4326",
        "filter": (
            "<Filter><PropertyIsLike wildCard='*' singleChar='.' escapeChar='!'>"
            "<PropertyName>ri_cd</PropertyName>"
            f"<Literal>{IMSIL_CODE_PREFIX}*</Literal>"
            "</PropertyIsLike></Filter>"
        ),
    })
    url = f"https://api.vworld.kr/req/wfs?{params}"

    print("VWorld API 요청 중...")
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            text = response.read().decode("utf-8")
    except urllib.error.URLError as e:
        sys.exit(f"VWorld 연결 오류: {e}")

    # VWorld는 요청 오류도 HTTP 200으로 반환하므로 features 유무를 확인
    try:
        geojson = json.loads(text)
    except json.JSONDecodeError:
        sys.exit(f"VWorld 응답이 JSON이 아닙니다:\n{text[:500]}")

    features = geojson.get("features", [])
    if not features:
        sys.exit(
            f"VWorld 응답에 features가 없습니다. "
            f"코드 prefix({IMSIL_CODE_PREFIX})·레이어명·PropertyName을 확인하세요.\n"
            f"응답 일부: {text[:500]}"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(text, encoding="utf-8")
    print(f"✅ VWorld 법정리 경계 저장 완료: {OUT_FILE} ({len(features)}건)")


if __name__ == "__main__":
    main()
