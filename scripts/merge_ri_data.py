"""법정리 단위 인구·접근성 데이터 결합 스크립트.

입력:
  - data/processed/population_ri.csv        (법정리별 인구)
  - data/processed/accessibility_ri.csv     (법정리별 버스 접근성)
  - data/processed/food_accessibility_ri.csv (법정리별 식료품점 접근성)
  - data/processed/legal_ri_imsil.geojson   (법정리 중심점 좌표)
출력:
  - data/processed/villages_ri.csv
컬럼: ri_code, ri_name, eup_myeon, center_lat, center_lng,
       total_pop, pop_65plus, aging_rate, pop_source, pop_year,
       nearest_stop_id, nearest_stop_name, nearest_stop_m,
       nearest_food_store_m, has_food_store
"""

from pathlib import Path

import geopandas as gpd
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
POP_FILE = BASE_DIR / "data" / "processed" / "population_ri.csv"
ACC_FILE = BASE_DIR / "data" / "processed" / "accessibility_ri.csv"
FOOD_ACC_FILE = BASE_DIR / "data" / "processed" / "food_accessibility_ri.csv"
RI_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"
OUT_FILE = BASE_DIR / "data" / "processed" / "villages_ri.csv"


def main() -> None:
    """법정리 코드로 인구·정류장 접근성·중심점 좌표를 결합해 CSV로 저장한다."""
    # 법정리 중심점: EPSG:5179로 변환 후 centroid 계산 → 다시 4326으로
    ri = gpd.read_file(RI_FILE)
    ri_proj = ri.to_crs(epsg=5179)
    centroids_proj = ri_proj.geometry.centroid
    centroids_wgs = gpd.GeoSeries(centroids_proj, crs="EPSG:5179").to_crs(epsg=4326)
    coords = ri[["ri_code"]].copy()
    coords["center_lat"] = centroids_wgs.y.round(6)
    coords["center_lng"] = centroids_wgs.x.round(6)

    # 인구
    pop = pd.read_csv(POP_FILE, encoding="utf-8-sig", dtype={"ri_code": str})
    pop = pop.rename(columns={"source": "pop_source", "year": "pop_year"})

    # 버스 접근성
    acc = pd.read_csv(ACC_FILE, encoding="utf-8-sig", dtype={"ri_code": str})

    # 식료품점 접근성
    food_acc = pd.read_csv(FOOD_ACC_FILE, encoding="utf-8-sig", dtype={"ri_code": str})

    # 결합 (ri_code 기준)
    result = (
        pop
        .merge(coords, on="ri_code", how="left")
        .merge(
            acc[["ri_code", "nearest_stop_id", "nearest_stop_name", "nearest_stop_m"]],
            on="ri_code",
            how="left",
        )
        .merge(
            food_acc[["ri_code", "nearest_store_m", "has_food_store"]]
            .rename(columns={"nearest_store_m": "nearest_food_store_m"}),
            on="ri_code",
            how="left",
        )
    )

    col_order = [
        "ri_code", "ri_name", "eup_myeon",
        "center_lat", "center_lng",
        "total_pop", "pop_65plus", "aging_rate",
        "pop_source", "pop_year",
        "nearest_stop_id", "nearest_stop_name", "nearest_stop_m",
        "nearest_food_store_m", "has_food_store",
    ]
    result = result[col_order]

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"✅ 저장 완료: {OUT_FILE} ({len(result)}건)")
    print("\n결합 결과 샘플:")
    print(result.head(5).to_string(index=False))

    # 결합 누락 확인
    missing = result[
        result["center_lat"].isna()
        | result["nearest_stop_m"].isna()
        | result["nearest_food_store_m"].isna()
    ]
    if missing.empty:
        print(f"\n✅ 누락 없이 전체 {len(result)}개 법정리 결합 완료")
    else:
        print(f"\n⚠️  결합 누락 {len(missing)}건:")
        print(missing[["ri_code", "ri_name"]].to_string(index=False))


if __name__ == "__main__":
    main()
