"""전북특별자치도 경로당 현황 API로 임실군 경로당을 받아 data/raw/에 저장한다.

실행: uv run python scripts/fetch_senior_centers.py
필요: .env의 DATA_GO_KR_API_KEY (일반 인증키 Decoding)

API는 좌표 없이 주소만 준다. 좌표는 정제 단계에서 지오코딩한다.
"""

import csv
import os
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

URL = "https://apis.data.go.kr/6450000/rfcapiElrbs/getElrbsList"
SIGUN_NAME = "임실군"
ROWS = 1000
FIELDS = ["dataNo", "facilityNm", "addr", "sigunNm", "baseDate"]
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"


def fetch_page(key: str, page: int) -> ET.Element:
    params = {"serviceKey": key, "pageNo": page, "numOfRows": ROWS}
    url = f"{URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        text = resp.read().decode("utf-8")
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        sys.exit(f"XML이 아닌 응답:\n{text[:500]}")
    code = root.findtext("header/resultCode")
    if code != "00":
        sys.exit(f"API 오류: {code} {root.findtext('header/resultMsg')}\n{text[:500]}")
    return root


def fetch_all(key: str) -> list[dict]:
    items: list[dict] = []
    page = 1
    while True:
        root = fetch_page(key, page)
        total = int(root.findtext("body/totalCount", "0"))
        batch = [
            {field: (row.findtext(field) or "").strip() for field in FIELDS}
            for row in root.iterfind("body/data/list")
        ]
        items.extend(batch)
        print(f"  page {page}: {len(items)}/{total}")
        if len(items) >= total:
            return items
        if not batch:
            sys.exit(f"빈 페이지 응답 ({len(items)}/{total}건). 일부만 저장하지 않습니다.")
        page += 1
        time.sleep(0.2)


def main() -> None:
    load_dotenv()
    key = os.getenv("DATA_GO_KR_API_KEY")
    if not key:
        sys.exit(".env에 DATA_GO_KR_API_KEY가 없습니다.")

    items = [item for item in fetch_all(key) if item["sigunNm"] == SIGUN_NAME]
    if not items:
        sys.exit(f"{SIGUN_NAME} 경로당을 찾지 못했습니다.")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"senior_centers_imsil_{date.today():%Y%m%d}.csv"
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(items)
    print(f"저장: {out} ({len(items)}건)")


if __name__ == "__main__":
    main()
