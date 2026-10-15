"""빈 정류장 입력과 최근접 정류장 거리·동률 처리를 검증한다."""

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point, box

from scripts import compute_accessibility as accessibility


@pytest.fixture
def input_files(tmp_path, monkeypatch):
    ri_file = tmp_path / "ri.geojson"
    gpd.GeoDataFrame(
        {"ri_code": ["A"], "ri_name": ["가리"], "eup_myeon": ["임실읍"]},
        geometry=[box(999990, 1699990, 1000010, 1700010)],
        crs="EPSG:5179",
    ).to_crs(epsg=4326).to_file(ri_file, driver="GeoJSON")
    stop_file = tmp_path / "stops.csv"
    out_file = tmp_path / "processed" / "accessibility.csv"
    monkeypatch.setattr(accessibility, "RI_FILE", ri_file)
    monkeypatch.setattr(accessibility, "STOP_FILE", stop_file)
    monkeypatch.setattr(accessibility, "OUT_FILE", out_file)
    return stop_file, out_file


def test_header_only_stops_fail_explicitly(input_files, capsys):
    stop_file, out_file = input_files
    stop_file.write_text("stop_id,stop_name,latitude,longitude\n", encoding="utf-8-sig")

    with pytest.raises(SystemExit) as error:
        accessibility.main()

    assert error.value.code == 1
    assert "버스정류장 데이터가 비어 있습니다" in capsys.readouterr().out
    assert not out_file.exists()


@pytest.mark.parametrize("nearest_ids", [[20, 10], [10, 20]])
def test_distance_and_first_csv_stop_wins_ties(input_files, nearest_ids):
    stop_file, out_file = input_files
    stops = gpd.GeoSeries(
        [Point(1000030, 1700040), Point(1000003, 1700004), Point(1000003, 1700004)],
        crs="EPSG:5179",
    ).to_crs(epsg=4326)
    pd.DataFrame({
        "stop_id": [30, *nearest_ids],
        "stop_name": ["먼 정류장", "첫 최근접 정류장", "둘째 최근접 정류장"],
        "latitude": stops.y,
        "longitude": stops.x,
    }).to_csv(stop_file, index=False, encoding="utf-8-sig")

    accessibility.main()

    result = pd.read_csv(out_file)
    assert result.loc[0, "nearest_stop_id"] == nearest_ids[0]
    assert result.loc[0, "nearest_stop_name"] == "첫 최근접 정류장"
    assert result.loc[0, "nearest_stop_m"] == 5
