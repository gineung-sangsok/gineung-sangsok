"""식료품점 필터, 직선거리 선택·도로시간, 결합 누락 보고를 검증한다."""

import geopandas as gpd
import networkx as nx
import pandas as pd
import pytest
from shapely.geometry import Point, box

from scripts import compute_food_accessibility as accessibility
from scripts import merge_ri_data


def test_food_store_categories(tmp_path, monkeypatch):
    categories = [
        "슈퍼마켓", "편의점", "반찬/식료품 소매업", "채소/과일 소매업",
        "정육점", "건어물/젓갈 소매업", "수산물 소매업", "곡물/곡분 소매업", "한식 일반 음식점",
    ]
    store_file = tmp_path / "stores.csv"
    pd.DataFrame({
        "bizesId": range(len(categories)), "indsSclsNm": categories,
        "lon": [127.1] * len(categories), "lat": [35.6] * len(categories),
    }).to_csv(store_file, index=False, encoding="utf-8-sig")
    monkeypatch.setattr(accessibility, "STORE_FILE", store_file)

    stores = accessibility.load_food_stores()

    assert stores["indsSclsNm"].tolist() == categories[:7]
    assert stores.crs.to_epsg() == 5179


@pytest.mark.parametrize(
    "straight_distance,road_distance,expected_method",
    [(500, 2000, "road"), (500, None, "straight_fallback"), (16000, 20000, "road")],
    ids=["straight-nearest-with-longer-road", "nearest-disconnected", "beyond-old-radius"],
)
def test_select_by_straight_distance_and_walk_by_road(
    tmp_path, monkeypatch, straight_distance, road_distance, expected_method,
):
    ri = gpd.GeoDataFrame(
        {"ri_code": ["A"], "ri_name": ["가리"], "eup_myeon": ["임실읍"]},
        geometry=[box(999990, 1699990, 1000010, 1700010)], crs="EPSG:5179",
    )
    stores = gpd.GeoDataFrame(
        {"store_id": ["farther", "nearest"], "bizesNm": ["먼 매장", "가까운 매장"]},
        geometry=[
            Point(1000000 + straight_distance + 500, 1700000),
            Point(1000000 + straight_distance, 1700000),
        ], crs="EPSG:5179",
    )
    graph = nx.MultiDiGraph(crs="EPSG:5179")
    graph.add_node(0, x=1000000, y=1700000)
    for i, point in enumerate(stores.geometry, start=1):
        graph.add_node(i, x=point.x, y=point.y)
    graph.add_edge(0, 1, length=1000)
    if road_distance is not None:
        graph.add_edge(0, 2, length=road_distance)

    monkeypatch.setattr(accessibility.gpd, "read_file", lambda _: ri)
    monkeypatch.setattr(accessibility, "load_food_stores", lambda: stores)
    monkeypatch.setattr(accessibility, "load_or_build_graph", lambda: graph)
    out_file = tmp_path / "food.csv"
    monkeypatch.setattr(accessibility, "OUT_FILE", out_file)

    accessibility.main()

    result = pd.read_csv(out_file).iloc[0]
    assert result["nearest_store_id"] == "nearest"
    assert result["nearest_store_name"] == "가까운 매장"
    assert result["nearest_store_m"] == straight_distance
    walk_distance = straight_distance if road_distance is None else road_distance
    assert result["nearest_store_min"] == round(walk_distance / (4000 / 60), 1)
    assert result["has_food_store"] == (straight_distance <= 1000)
    assert result["calc_method"] == expected_method


@pytest.mark.parametrize("missing_food", [False, True], ids=["complete", "missing-food"])
def test_merge_reports_missing_food_distance(tmp_path, monkeypatch, capsys, missing_food):
    ri = gpd.GeoDataFrame(
        {"ri_code": ["A", "B", "C"]},
        geometry=[Point(127.1, 35.6)] * 3, crs="EPSG:4326",
    )
    monkeypatch.setattr(merge_ri_data.gpd, "read_file", lambda _: ri)
    inputs = {
        "POP_FILE": pd.DataFrame({
            "ri_code": ["A", "B", "C"], "ri_name": ["가리", "나리", "다리"],
            "eup_myeon": ["임실읍"] * 3, "total_pop": [100] * 3,
            "pop_65plus": [30] * 3, "aging_rate": [0.3] * 3,
            "source": ["fixture"] * 3, "year": [2026] * 3,
        }),
        "ACC_FILE": pd.DataFrame({
            "ri_code": ["A", "B", "C"], "nearest_stop_id": ["stop"] * 3,
            "nearest_stop_name": ["정류장"] * 3, "nearest_stop_m": [100] * 3,
        }),
        "FOOD_ACC_FILE": pd.DataFrame({
            "ri_code": ["A", "B", "C"], "nearest_store_m": [500, 600, 700],
            "has_food_store": [True] * 3,
        }),
    }
    if missing_food:
        # B는 조인할 행 자체가 없고, C는 행은 있지만 거리 값이 없다.
        inputs["FOOD_ACC_FILE"] = inputs["FOOD_ACC_FILE"].drop(index=1)
        inputs["FOOD_ACC_FILE"].loc[2, "nearest_store_m"] = float("nan")
    for name, frame in inputs.items():
        path = tmp_path / f"{name}.csv"
        frame.to_csv(path, index=False, encoding="utf-8-sig")
        monkeypatch.setattr(merge_ri_data, name, path)
    out_file = tmp_path / "villages.csv"
    monkeypatch.setattr(merge_ri_data, "OUT_FILE", out_file)

    merge_ri_data.main()

    output = capsys.readouterr().out
    result = pd.read_csv(out_file)
    assert result["center_lat"].notna().all()
    assert result["nearest_stop_m"].notna().all()
    if missing_food:
        assert result["nearest_food_store_m"].isna().sum() == 2
        assert "결합 누락 2건" in output
        assert "누락 없이" not in output
        missing_report = output.split("결합 누락 2건:")[1]
        assert "나리" in missing_report and "다리" in missing_report
        assert "가리" not in missing_report
    else:
        assert result["nearest_food_store_m"].notna().all()
        assert "누락 없이 전체 3개 법정리 결합 완료" in output
