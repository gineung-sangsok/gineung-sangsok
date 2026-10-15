"""SGIS 읍면 인구 → 법정리 균등 배분 스크립트.

읍면 단위 SGIS 인구를 해당 읍면의 법정리 수로 균등 배분한다.
격자 인구 확보 전까지의 임시값이며 source=estimate 로 표시한다.

입력:
  - data/raw/sgis_population_imsil_2020.json  (읍면별 총인구·65세이상)
  - data/processed/legal_ri_imsil.geojson     (법정리 목록 및 읍면 정보)
출력:
  - data/processed/population_ri.csv
컬럼: ri_code, ri_name, eup_myeon, total_pop, pop_65plus, aging_rate, source, year
"""

import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
POP_FILE = BASE_DIR / "data" / "raw" / "sgis_population_imsil_2020.json"
RI_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"
OUT_FILE = BASE_DIR / "data" / "processed" / "population_ri.csv"


def load_eup_myeon_population(pop_file: Path) -> pd.DataFrame:
    """SGIS JSON → 읍면별 총인구·65세이상 DataFrame."""
    with open(pop_file, encoding="utf-8") as f:
        data = json.load(f)

    year = data["metadata"]["year"]

    total = {
        row["adm_nm"]: int(row["tot_ppltn"])
        for row in data["total_population"]
    }
    elderly = {
        row["adm_nm"]: int(row["population"])
        for row in data["population_65_plus"]
    }

    rows = []
    for name, tot in total.items():
        e65 = elderly.get(name, 0)
        rows.append({
            "eup_myeon": name,
            "eup_total_pop": tot,
            "eup_pop_65plus": e65,
            "year": year,
        })
    return pd.DataFrame(rows)


def main() -> None:
    """읍면 인구를 법정리에 균등 배분해 추정값임을 표시한 CSV로 저장한다."""
    # 읍면별 인구 로드
    eup_pop = load_eup_myeon_population(POP_FILE)
    print("📊 읍면별 인구 로드:")
    print(eup_pop[["eup_myeon", "eup_total_pop", "eup_pop_65plus"]].to_string(index=False))

    # 법정리 목록 로드
    ri = gpd.read_file(RI_FILE)[["ri_code", "ri_name", "eup_myeon"]]

    # 읍면별 법정리 수 계산
    ri_count = ri.groupby("eup_myeon").size().reset_index(name="ri_count")

    # 읍면 인구 + 법정리 수 결합
    merged = ri.merge(eup_pop, on="eup_myeon", how="left")
    merged = merged.merge(ri_count, on="eup_myeon", how="left")

    missing_eup = merged.loc[merged["eup_total_pop"].isna(), "eup_myeon"].unique().tolist()
    if missing_eup:
        print(f"❌ 읍면 인구 누락: {missing_eup}")
        raise SystemExit(1)

    # 균등 배분 (소수점 반올림)
    merged["total_pop"] = (merged["eup_total_pop"] / merged["ri_count"]).round().astype(int)
    merged["pop_65plus"] = (merged["eup_pop_65plus"] / merged["ri_count"]).round().astype(int)
    denominator = merged["total_pop"].mask(merged["total_pop"] == 0)
    merged["aging_rate"] = (merged["pop_65plus"] / denominator * 100).round(1)
    merged["source"] = "estimate"

    result = merged[[
        "ri_code", "ri_name", "eup_myeon",
        "total_pop", "pop_65plus", "aging_rate",
        "source", "year",
    ]]

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"\n✅ 저장 완료: {OUT_FILE} ({len(result)}건)")
    print("\n📊 읍면별 고령화율 (균등배분 기준):")
    summary = (
        result.groupby("eup_myeon")[["total_pop", "pop_65plus", "aging_rate"]]
        .first()
        .sort_values("aging_rate", ascending=False)
    )
    print(summary.to_string())


if __name__ == "__main__":
    main()
