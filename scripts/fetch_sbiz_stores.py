"""소상공인시장진흥공단 상가(상권)정보 API로 임실군 상가 전체를 받아 data/raw/에 저장한다.

실행: uv run python scripts/fetch_sbiz_stores.py
필요: .env의 DATA_GO_KR_API_KEY (일반 인증키 Decoding)
"""

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

URL = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInDong"
# 임실군 시군구코드 (전북특별자치도 출범 이후 코드. 이전 코드 45750은 NODATA)
SIGNGU_CODE = "52750"
SIGNGU_NAME = "임실군"
ROWS = 1000
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"


def fetch_page(key: str, signgu: str, page: int) -> dict:
    params = {
        "serviceKey": key,
        "divId": "signguCd",
        "key": signgu,
        "numOfRows": ROWS,
        "pageNo": page,
        "type": "json",
    }
    url = f"{URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        text = resp.read().decode("utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        sys.exit(f"JSON이 아닌 응답 (키 오류 가능):\n{text[:500]}")


def fetch_all(key: str, signgu: str) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        data = fetch_page(key, signgu, page)
        header = data.get("header", {})
        if header.get("resultCode") not in ("00", None):
            # 03: 데이터 없음
            if header.get("resultCode") == "03":
                return items
            sys.exit(f"API 오류: {header}")
        body = data.get("body", {})
        batch = body.get("items") or []
        items.extend(batch)
        total = int(body.get("totalCount", 0))
        print(f"  {signgu} page {page}: {len(items)}/{total}")
        if len(items) >= total or not batch:
            return items
        page += 1
        time.sleep(0.2)


def main() -> None:
    load_dotenv()
    key = os.getenv("DATA_GO_KR_API_KEY")
    if not key:
        sys.exit(".env에 DATA_GO_KR_API_KEY가 없습니다.")

    items = fetch_all(key, SIGNGU_CODE)
    if not items:
        sys.exit(f"{SIGNGU_NAME} 상가 데이터를 찾지 못했습니다.")
    names = {item.get("signguNm") for item in items}
    if names != {SIGNGU_NAME}:
        sys.exit(f"시군구코드 {SIGNGU_CODE}가 {SIGNGU_NAME}이 아닙니다: {names}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"sbiz_stores_imsil_{date.today():%Y%m%d}.csv"
    fields = list(dict.fromkeys(k for item in items for k in item))
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(items)
    print(f"저장: {out} ({len(items)}건)")

if __name__ == "__main__":
    main()
