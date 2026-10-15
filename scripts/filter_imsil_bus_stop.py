"""전국 버스정류장 CSV에서 임실군을 필터링해 정제 CSV로 저장한다.

입력: data/raw/national_bus_stops.csv
출력: data/processed/bus_stops_imsil.csv
컬럼: stop_id, stop_name, latitude, longitude
"""

import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
SRC_FILE = BASE_DIR / "data" / "raw" / "national_bus_stops.csv"
OUT_FILE = BASE_DIR / "data" / "processed" / "bus_stops_imsil.csv"


def main() -> None:
    """도시명과 임실군 bbox로 정류장을 걸러 ID·이름을 보존해 저장한다."""
    if not SRC_FILE.exists():
        print(f"❌ 원본 파일 없음: {SRC_FILE}")
        sys.exit(1)

    df = None
    for enc in ["cp949", "utf-8-sig", "euc-kr"]:
        try:
            df = pd.read_csv(SRC_FILE, encoding=enc, dtype={"정류장번호": str, "정류장명": str})
            break
        except Exception:
            continue

    if df is None:
        print("❌ CSV 인코딩을 읽을 수 없습니다.")
        sys.exit(1)

    # 도시명과 임실군 bbox로 필터 (위도 35.4~35.85, 경도 127.0~127.5)
    imsil = df[
        df["도시명"].str.contains("임실", na=False)
        & df["위도"].between(35.4, 35.85)
        & df["경도"].between(127.0, 127.5)
    ].copy()

    if imsil.empty:
        print("❌ 임실군 데이터를 찾지 못했습니다.")
        sys.exit(1)

    result = imsil.rename(columns={
        "정류장번호": "stop_id",
        "정류장명": "stop_name",
        "위도": "latitude",
        "경도": "longitude",
    })[["stop_id", "stop_name", "latitude", "longitude"]]

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"✅ 저장 완료: {OUT_FILE} ({len(result)}건)")

    # 임실군 범위 밖 좌표 검증 (위도 35.4~35.85, 경도 127.0~127.5)
    out_of_bounds = result[
        ~(result["latitude"].between(35.4, 35.85) & result["longitude"].between(127.0, 127.5))
    ]
    print(f"   범위 밖 좌표: {len(out_of_bounds)}건")


if __name__ == "__main__":
    main()
