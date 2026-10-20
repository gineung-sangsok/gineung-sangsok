"""도로거리 탐색 상한과 도로망 단절 시 직선거리 대체를 검증한다."""

import geopandas as gpd
import networkx as nx
import pandas as pd
import pytest
from shapely.geometry import Point, box

from scripts import compute_road_accessibility as accessibility


@pytest.mark.parametrize(
    "road_lengths,expected_stop,expected_distance,expected_method,expected_cutoffs",
    [
        ((14000, 18000), "first", 14000, "road", [15000]),
        ((15000, 18000), "first", 15000, "road", [15000]),
        ((None, 15001), "second", 15001, "road", [15000, None]),
        ((20000, 16000), "second", 16000, "road", [15000, None]),
        ((None, None), "first", 50, "straight_fallback", [15000, None]),
    ],
    ids=["within-cutoff", "at-cutoff", "beyond-cutoff", "nearest-road", "disconnected"],
)
def test_road_search_and_fallback(
    tmp_path, monkeypatch, road_lengths, expected_stop, expected_distance,
    expected_method, expected_cutoffs,
):
    ri_file = tmp_path / "ri.geojson"
    gpd.GeoDataFrame(
        {"ri_code": ["A"], "ri_name": ["가리"], "eup_myeon": ["임실읍"]},
        geometry=[box(999990, 1699990, 1000010, 1700010)],
        crs="EPSG:5179",
    ).to_crs(epsg=4326).to_file(ri_file, driver="GeoJSON")
    stop_file = tmp_path / "stops.csv"
    stops = gpd.GeoSeries(
        [Point(1000030, 1700040), Point(1000060, 1700080)], crs="EPSG:5179",
    ).to_crs(epsg=4326)
    pd.DataFrame({
        "stop_id": ["first", "second"],
        "stop_name": ["가까운 정류장", "먼 정류장"],
        "latitude": stops.y,
        "longitude": stops.x,
    }).to_csv(stop_file, index=False, encoding="utf-8-sig")
    out_file = tmp_path / "processed" / "accessibility.csv"
    monkeypatch.setattr(accessibility, "RI_FILE", ri_file)
    monkeypatch.setattr(accessibility, "STOP_FILE", stop_file)
    monkeypatch.setattr(accessibility, "OUT_FILE", out_file)

    graph = nx.MultiDiGraph(crs="EPSG:5179")
    graph.add_node(0, x=1000000, y=1700000)
    graph.add_node(1, x=1000030, y=1700040)
    graph.add_node(2, x=1000060, y=1700080)
    graph.add_edge(0, 0, length=0)
    for stop_node, length in enumerate(road_lengths, start=1):
        if length is not None:
            graph.add_edge(0, stop_node, length=length)
    monkeypatch.setattr(accessibility, "load_or_download_graph", lambda: graph)

    cutoffs = []
    original_dijkstra = nx.single_source_dijkstra_path_length

    def track_dijkstra(graph, source, cutoff=None, weight="weight"):
        cutoffs.append(cutoff)
        return original_dijkstra(graph, source, cutoff=cutoff, weight=weight)

    monkeypatch.setattr(nx, "single_source_dijkstra_path_length", track_dijkstra)

    accessibility.main()

    result = pd.read_csv(out_file).iloc[0]
    assert result["nearest_stop_id"] == expected_stop
    assert result["nearest_stop_m"] == expected_distance
    assert result["nearest_stop_min"] == round(expected_distance / (4000 / 60), 1)
    assert result["calc_method"] == expected_method
    assert cutoffs == expected_cutoffs
