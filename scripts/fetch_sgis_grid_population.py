"""SGIS 100m 격자 인구 → 법정리 단위 집계 스크립트.

격자 경계 SHP + 인구 CSV를 결합해 임실군 법정리별 총인구를 산출한다.
65세이상 인구는 격자 총인구 × 읍면 고령화율로 추정한다 (source=grid+estimate).

입력:
  - data/raw/_census_reqdoc_*/2020년_인구_다마_100M.csv
  - data/raw/_census_reqdoc_*/2020년_인구_라마_100M.csv
  - data/raw/_grid_border_*/grid_다마_100M.shp
  - data/raw/_grid_border_*/grid_라마_100M.shp
  - data/processed/legal_ri_imsil.geojson
  - data/raw/sgis_population_imsil_2020.json  (읍면 고령화율용)
출력:
  - data/processed/population_ri.csv  (기존 균등배분 파일 교체)
컬럼: ri_code, ri_name, eup_myeon, total_pop, pop_65plus, aging_rate, source, year
"""

import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"
OUT_FILE = BASE_DIR / "data" / "processed" / "population_ri.csv"
RI_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"
SGIS_FILE = BASE_DIR / "data" / "raw" / "sgis_population_imsil_2020.json"

EPSG_CALC = 5179
YEAR = 2020


def find_raw_dir(keyword: str) -> Path:
    """data/raw/ 안에서 keyword를 포함하는 디렉토리를 찾는다.

    macOS는 파일시스템 경로를 NFD로 저장하므로 유니코드 정규화 후 비교한다.
    """
    import unicodedata

    kw_nfc = unicodedata.normalize("NFC", keyword)
    matches = [
        d
        for d in RAW_DIR.iterdir()
        if d.is_dir() and kw_nfc in unicodedata.normalize("NFC", d.name)
    ]
    if not matches:
        raise FileNotFoundError(f"data/raw/ 에서 '{keyword}' 포함 디렉토리를 찾을 수 없습니다.")
    return matches[0]


def load_grid_population() -> pd.DataFrame:
    """다마·라마 인구 CSV를 합쳐 총인구(to_in_001)만 추출한다."""
    census_dir = find_raw_dir("_census_reqdoc_")
    dfs = []
    for region in ["다마", "라마"]:
        path = census_dir / f"{YEAR}년_인구_{region}_100M.csv"
        df = pd.read_csv(
            path,
            encoding="cp949",
            header=None,
            names=["year", "grid_cd", "var_cd", "value"],
        )
        dfs.append(df)
    df_all = pd.concat(dfs, ignore_index=True)
    # 총인구(to_in_001)만 사용
    total = df_all[df_all["var_cd"] == "to_in_001"][["grid_cd", "value"]].copy()
    total = total.rename(columns={"value": "pop"})
    return total


def load_grid_geometry() -> gpd.GeoDataFrame:
    """다마·라마 격자 SHP를 합쳐 EPSG:5179로 변환한다."""
    gdfs = []
    for region in ["다마", "라마"]:
        shp_dir = find_raw_dir(f"grid_{region}_grid_{region}")
        shp = shp_dir / f"grid_{region}_100M.shp"
        gdfs.append(gpd.read_file(shp))
    grid = pd.concat(gdfs, ignore_index=True)
    return gpd.GeoDataFrame(grid, geometry="geometry", crs=gdfs[0].crs).to_crs(
        epsg=EPSG_CALC
    )


def load_eup_myeon_aging_rate() -> dict[str, float]:
    """SGIS JSON에서 읍면별 고령화율을 계산한다."""
    with open(SGIS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    total = {r["adm_nm"]: int(r["tot_ppltn"]) for r in data["total_population"]}
    elderly = {r["adm_nm"]: int(r["population"]) for r in data["population_65_plus"]}
    return {
        name: elderly.get(name, 0) / tot if tot > 0 else 0
        for name, tot in total.items()
    }


def main() -> None:
    # 법정리 경계 로드
    ri = gpd.read_file(RI_FILE).to_crs(epsg=EPSG_CALC)
    print(f"📍 법정리 {len(ri)}개 로드")

    # 격자 geometry 로드
    grid_geom = load_grid_geometry()
    print(f"🔲 격자 {len(grid_geom)}개 로드")

    # 인구 CSV 로드
    pop_df = load_grid_population()
    print(f"👥 인구 레코드 {len(pop_df)}개 로드")

    # 격자 geometry + 인구 결합
    grid_pop = grid_geom.merge(pop_df, left_on="GRID_CD", right_on="grid_cd", how="left")
    grid_pop["pop"] = grid_pop["pop"].fillna(0)

    # 임실군 내 격자만 필터 (within으로 경계 중복 방지)
    imsil_union = ri.geometry.union_all()
    grid_imsil = grid_pop[grid_pop.geometry.within(imsil_union)].copy()
    print(f"🗺️  임실군 내부 격자: {len(grid_imsil)}개 (총인구 합: {int(grid_imsil['pop'].sum())})")

    # 격자 중심점으로 법정리와 공간결합
    grid_imsil = grid_imsil.copy()
    grid_imsil["geometry"] = grid_imsil.geometry.centroid
    joined = gpd.sjoin(
        grid_imsil[["GRID_CD", "pop", "geometry"]],
        ri[["ri_code", "ri_name", "eup_myeon", "geometry"]],
        how="left",
        predicate="within",
    )

    # 법정리별 총인구 집계
    ri_pop = (
        joined.groupby(["ri_code", "ri_name", "eup_myeon"])["pop"]
        .sum()
        .reset_index()
        .rename(columns={"pop": "total_pop"})
    )
    ri_pop["total_pop"] = ri_pop["total_pop"].round().astype(int)

    # 읍면 고령화율 적용 → 법정리별 65세이상 추정
    aging_rate_map = load_eup_myeon_aging_rate()
    ri_pop["aging_rate_eup"] = ri_pop["eup_myeon"].map(aging_rate_map).fillna(0)
    ri_pop["pop_65plus"] = (ri_pop["total_pop"] * ri_pop["aging_rate_eup"]).round().astype(int)
    ri_pop["aging_rate"] = (
        ri_pop["pop_65plus"] / ri_pop["total_pop"].replace(0, 1) * 100
    ).round(1)
    ri_pop["source"] = "grid+estimate"
    ri_pop["year"] = YEAR

    # 법정리 전체 포함 보장 (격자 없는 법정리는 0으로)
    all_ri = ri[["ri_code", "ri_name", "eup_myeon"]].copy()
    result = all_ri.merge(
        ri_pop[["ri_code", "total_pop", "pop_65plus", "aging_rate", "source", "year"]],
        on="ri_code",
        how="left",
    )
    result["total_pop"] = result["total_pop"].fillna(0).astype(int)
    result["pop_65plus"] = result["pop_65plus"].fillna(0).astype(int)
    result["aging_rate"] = result["aging_rate"].fillna(0)
    result["source"] = result["source"].fillna("grid+estimate")
    result["year"] = result["year"].fillna(YEAR).astype(int)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"\n✅ 저장 완료: {OUT_FILE} ({len(result)}건)")
    print("\n📊 읍면별 총인구 합계 (격자 기반):")
    summary = result.groupby("eup_myeon")[["total_pop", "pop_65plus", "aging_rate"]].agg(
        {"total_pop": "sum", "pop_65plus": "sum", "aging_rate": "mean"}
    ).sort_values("aging_rate", ascending=False)
    print(summary.to_string())


if __name__ == "__main__":
    main()
