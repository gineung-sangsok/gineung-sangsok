# scripts/filter_imsil_bus_stops.py
import csv
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
SRC_FILE = BASE_DIR / "data" / "raw" / "national_bus_stops.csv"
OUT_FILE = BASE_DIR / "data" / "raw" / "imsil_bus_stops.csv"

def main():
    if not SRC_FILE.exists():
        print(f"⚠️ 원본 파일이 없습니다: {SRC_FILE}")
        return

    df_full = None
    for enc in ['cp949', 'utf-8-sig', 'euc-kr']:
        try:
            df_full = pd.read_csv(SRC_FILE, encoding=enc)
            break
        except Exception:
            continue

    if df_full is None:
        print("❌ CSV 파일을 읽을 수 없습니다. 인코딩을 확인해 주세요.")
        return

    # 관리도시명 또는 도시명에 '임실'이 포함된 경우 필터링
    mask = df_full.astype(str).apply(
        lambda x: x.str.contains('임실', na=False)
    ).any(axis=1)
    imsil_df = df_full[mask]

    if imsil_df.empty:
        print("❌ 임실군 데이터를 찾지 못했습니다.")
        return

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for _, row in imsil_df.iterrows():
        rows.append([
            row.get("정류소번호", ""),
            row.get("정류소명", ""),
            row.get("위도", ""),
            row.get("경도", ""),
            f"전북특별자치도 임실군 {row.get('정류소명', '')}"
        ])

    headers = ["stop_id", "stop_name", "latitude", "longitude", "address"]
    with open(OUT_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"✅ 임실군 버스정류장 정제 완료: {OUT_FILE} (총 {len(rows)}개 정류장)")

if __name__ == "__main__":
    main()
