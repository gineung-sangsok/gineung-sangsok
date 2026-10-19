"""읍면 인구 누락과 0 분모를 검증하고 균등 배분·반올림을 확인한다."""

import json

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Point

from scripts import distribute_population as population


def configure_inputs(tmp_path, monkeypatch, eup_names, populations):
    ri_file = tmp_path / "ri.geojson"
    gpd.GeoDataFrame(
        {
            "ri_code": [f"R{i}" for i in range(len(eup_names))],
            "ri_name": [f"마을{i}" for i in range(len(eup_names))],
            "eup_myeon": eup_names,
        },
        geometry=[Point(127.2, 35.6)] * len(eup_names),
        crs="EPSG:4326",
    ).to_file(ri_file, driver="GeoJSON")
    pop_file = tmp_path / "population.json"
    pop_file.write_text(json.dumps({
        "metadata": {"year": 2020},
        "total_population": [
            {"adm_nm": name, "tot_ppltn": total} for name, total, _ in populations
        ],
        "population_65_plus": [
            {"adm_nm": name, "population": elderly} for name, _, elderly in populations
        ],
    }), encoding="utf-8")
    out_file = tmp_path / "processed" / "population.csv"
    monkeypatch.setattr(population, "RI_FILE", ri_file)
    monkeypatch.setattr(population, "POP_FILE", pop_file)
    monkeypatch.setattr(population, "OUT_FILE", out_file)
    return out_file


def test_missing_population_lists_unique_eup_and_fails(tmp_path, monkeypatch, capsys):
    out_file = configure_inputs(
        tmp_path, monkeypatch,
        ["임실읍", "누락가면", "누락가면", "누락나면"], [("임실읍", 10, 5)],
    )

    with pytest.raises(SystemExit) as error:
        population.main()

    assert error.value.code == 1
    output = capsys.readouterr().out
    assert "읍면 인구 누락: ['누락가면', '누락나면']" in output
    assert not out_file.exists()


def test_zero_denominators_and_rounded_equal_distribution(tmp_path, monkeypatch):
    out_file = configure_inputs(
        tmp_path, monkeypatch,
        ["임실읍"] * 3 + ["빈면", "반올림면", "반올림면", "반올림면"],
        [("임실읍", 10, 5), ("빈면", 0, 1), ("반올림면", 1, 1)],
    )

    population.main()

    result = pd.read_csv(out_file)
    regular = result[result["eup_myeon"] == "임실읍"]
    assert regular["total_pop"].tolist() == [3, 3, 3]
    assert regular["pop_65plus"].tolist() == [2, 2, 2]
    assert regular["aging_rate"].tolist() == [66.7, 66.7, 66.7]
    zero = result[result["eup_myeon"] != "임실읍"]
    assert zero["total_pop"].tolist() == [0, 0, 0, 0]
    assert zero["pop_65plus"].tolist() == [1, 0, 0, 0]
    assert zero["aging_rate"].isna().all()
    assert result["source"].eq("estimate").all()
    assert result["year"].eq(2020).all()
