"""법정리 중심점 기준 최근접 버스 정류장 직선거리 계산 스크립트.

입력:
  - data/processed/legal_ri_imsil.geojson  (법정리 경계, EPSG:4326)
  - data/processed/bus_stops_imsil.csv     (임실군 버스정류장)
출력:
  - data/processed/accessibility_ri.csv
컬럼: ri_code, ri_name, eup_myeon, nearest_stop_id, nearest_stop_name, nearest_stop_m
거리 계산: EPSG:5179 (UTM-K, 미터 단위)
"""

from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

BASE_DIR = Path(__file__).resolve().parents[1]
RI_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"
STOP_FILE = BASE_DIR / "data" / "processed" / "bus_stops_imsil.csv"
OUT_FILE = BASE_DIR / "data" / "processed" / "accessibility_ri.csv"

EPSG_CALC = 5179  # 거리 계산용 좌표계 (계약 v1.0)


def main() -> None:
    """법정리 중심점별 최근접 정류장과 EPSG:5179 직선거리를 CSV로 저장한다."""
    # 법정리 GeoJSON 로드 및 중심점 계산
    ri = gpd.read_file(RI_FILE)
    ri_proj = ri.to_crs(epsg=EPSG_CALC)
    ri_proj["centroid"] = ri_proj.geometry.centroid
    print(f"📍 법정리 {len(ri_proj)}개 중심점 계산 완료")

    # 버스 정류장 로드 → GeoDataFrame 변환
    stops_df = pd.read_csv(STOP_FILE, encoding="utf-8-sig")
    stops_gdf = gpd.GeoDataFrame(
        stops_df,
        geometry=[
            Point(lon, lat)
            for lat, lon in zip(stops_df["latitude"], stops_df["longitude"], strict=False)
        ],
        crs="EPSG:4326",
    ).to_crs(epsg=EPSG_CALC)
    print(f"🚌 버스정류장 {len(stops_gdf)}개 로드 완료")

    # 법정리별 최근접 정류장 계산
    records = []
    stop_coords = list(zip(stops_gdf.geometry.x, stops_gdf.geometry.y, strict=False))

    for _, row in ri_proj.iterrows():
        cx, cy = row["centroid"].x, row["centroid"].y
        min_dist = float("inf")
        nearest_idx = 0
        for i, (sx, sy) in enumerate(stop_coords):
            dist = ((cx - sx) ** 2 + (cy - sy) ** 2) ** 0.5
            if dist < min_dist:
                min_dist = dist
                nearest_idx = i

        nearest = stops_gdf.iloc[nearest_idx]
        records.append({
            "ri_code": row["ri_code"],
            "ri_name": row["ri_name"],
            "eup_myeon": row["eup_myeon"],
            "nearest_stop_id": nearest["stop_id"],
            "nearest_stop_name": nearest["stop_name"],
            "nearest_stop_m": round(min_dist),
        })

    result = pd.DataFrame(records)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"✅ 저장 완료: {OUT_FILE}")
    print("\n📊 읍면별 최근접 정류장 평균 거리(m):")
    summary = result.groupby("eup_myeon")["nearest_stop_m"].agg(["mean", "max", "min"]).astype(int)
    print(summary.sort_values("mean", ascending=False).to_string())


if __name__ == "__main__":
    main()
