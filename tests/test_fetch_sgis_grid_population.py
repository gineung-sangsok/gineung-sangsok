"""격자 입력 탐색과 중심점 기준 법정리 인구 집계를 검증한다."""

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

from scripts import fetch_sgis_grid_population as population


def test_load_grid_geometry_from_grid_border_directory(tmp_path, monkeypatch):
    shp_dir = tmp_path / "_grid_border_fixture"
    shp_dir.mkdir()
    for region in ["다마", "라마"]:
        grid = gpd.GeoDataFrame(
            {"GRID_CD": [region]}, geometry=[box(0, 0, 100, 100)], crs="EPSG:5179"
        )
        grid.to_file(shp_dir / f"grid_{region}_100M.shp", encoding="UTF-8")
    monkeypatch.setattr(population, "RAW_DIR", tmp_path)

    result = population.load_grid_geometry()

    assert result["GRID_CD"].tolist() == ["다마", "라마"]
    assert result.crs.to_epsg() == population.EPSG_CALC


def test_main_assigns_boundary_grids_by_centroid(tmp_path, monkeypatch):
    ri = gpd.GeoDataFrame(
        {
            "ri_code": ["A", "B", "C"],
            "ri_name": ["가리", "나리", "다리"],
            "eup_myeon": ["임실읍"] * 3,
        },
        geometry=[box(0, 0, 100, 100), box(100, 0, 200, 100), box(200, 0, 300, 100)],
        crs="EPSG:5179",
    )
    ri_file = tmp_path / "ri.geojson"
    ri.to_file(ri_file, driver="GeoJSON")
    grids = gpd.GeoDataFrame(
        {"GRID_CD": ["county_edge", "ri_edge_a", "ri_edge_b", "outside_center", "outside"]},
        geometry=[
            box(-25, 25, 75, 75),
            box(75, 25, 115, 75),
            box(90, 25, 130, 75),
            box(-75, 25, 25, 75),
            box(400, 25, 450, 75),
        ],
        crs="EPSG:5179",
    )
    counts = pd.DataFrame({"grid_cd": grids["GRID_CD"], "pop": [10, 20, 30, 40, 50]})
    out_file = tmp_path / "population_ri.csv"
    monkeypatch.setattr(population, "RI_FILE", ri_file)
    monkeypatch.setattr(population, "OUT_FILE", out_file)
    monkeypatch.setattr(population, "load_grid_geometry", lambda: grids)
    monkeypatch.setattr(population, "load_grid_population", lambda: counts)
    monkeypatch.setattr(population, "load_eup_myeon_aging_rate", lambda: {"임실읍": 0.5})

    population.main()

    result = pd.read_csv(out_file).set_index("ri_code")
    assert result["total_pop"].to_dict() == {"A": 30, "B": 30, "C": 0}
    assert result["pop_65plus"].to_dict() == {"A": 15, "B": 15, "C": 0}
    assert result["ri_name"].notna().all()
