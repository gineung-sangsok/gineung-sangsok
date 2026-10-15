"""LX 법정구역 경계 shapefile → 임실군 법정리 GeoJSON 변환 스크립트.

입력: data/raw/LX법정구역경계_리_전국/RI.shp
출력: data/processed/legal_ri_imsil.geojson
좌표계: ESRI:102082 → EPSG:4326
"""

from pathlib import Path

import geopandas as gpd

BASE_DIR = Path(__file__).resolve().parents[1]
SRC_FILE = BASE_DIR / "data" / "raw" / "LX법정구역경계_리_전국" / "RI.shp"
OUT_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"


def parse_eup_myeon(adzn_nm: str) -> str:
    """'전북특별자치도 임실군 삼계면 죽계리' → '삼계면'."""
    parts = adzn_nm.strip().split()
    # parts: [도, 시군, 읍면, 리]
    return parts[2] if len(parts) >= 4 else ""


def main() -> None:
    """LX 경계에서 임실군 법정리를 추출해 EPSG:4326 GeoJSON으로 저장한다."""
    if not SRC_FILE.exists():
        print(f"❌ 원본 파일 없음: {SRC_FILE}")
        return

    print("📂 shapefile 읽는 중...")
    gdf = gpd.read_file(SRC_FILE)

    # 임실군 필터
    imsil = gdf[gdf["adzn_nm"].str.contains("임실군", na=False)].copy()
    print(f"✅ 임실군 법정리 {len(imsil)}건 추출")

    # 좌표계 변환 ESRI:102082 → EPSG:4326
    imsil = imsil.to_crs(epsg=4326)

    # 컬럼 정리
    imsil["ri_code"] = imsil["li_cd"].astype(str).str.zfill(10)
    imsil["ri_name"] = imsil["li_nm"].str.strip()
    imsil["eup_myeon"] = imsil["adzn_nm"].apply(parse_eup_myeon)

    result = imsil[["ri_code", "ri_name", "eup_myeon", "geometry"]]

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_file(OUT_FILE, driver="GeoJSON")
    print(f"💾 저장 완료: {OUT_FILE}")
    print(f"   읍면 목록: {sorted(result['eup_myeon'].unique())}")


if __name__ == "__main__":
    main()
