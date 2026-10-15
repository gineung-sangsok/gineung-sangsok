"""정류장 CSV의 bbox 필터와 식별자 보존을 검증한다."""

import csv

import pytest

from scripts import filter_imsil_bus_stop


@pytest.mark.parametrize("encoding", ["cp949", "utf-8-sig"])
def test_filter_saves_only_imsil_stops_inside_bbox(tmp_path, monkeypatch, encoding):
    """경계점을 포함하고 범위 밖·좌표 누락 행을 제외하며 ID와 이름을 보존한다."""
    source = tmp_path / "national_bus_stops.csv"
    output = tmp_path / "processed" / "bus_stops_imsil.csv"
    rows = [
        ["전라북도 임실군", "00123", "임실역", 35.6, 127.2],
        ["전북특별자치도 임실군", "00001", "남서 경계", 35.4, 127.0],
        ["전라북도 임실군", "00002", "북동 경계", 35.85, 127.5],
        ["전라북도 임실군", "00003", "남쪽 밖", 35.3999, 127.2],
        ["전라북도 임실군", "00004", "북쪽 밖", 35.8501, 127.2],
        ["전라북도 임실군", "00005", "서쪽 밖", 35.6, 126.9999],
        ["전라북도 임실군", "00006", "동쪽 밖", 35.6, 127.5001],
        ["전라북도 임실군", "00007", "위도 누락", "", 127.2],
        ["전라북도 임실군", "00008", "경도 누락", 35.6, ""],
        ["다른 도시", "00009", "다른 도시 정류장", 35.6, 127.2],
        ["", "00010", "도시명 누락", 35.6, 127.2],
    ]
    with source.open("w", encoding=encoding, newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["도시명", "정류장번호", "정류장명", "위도", "경도"])
        writer.writerows(rows)
    monkeypatch.setattr(filter_imsil_bus_stop, "SRC_FILE", source)
    monkeypatch.setattr(filter_imsil_bus_stop, "OUT_FILE", output)

    filter_imsil_bus_stop.main()

    with output.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        assert reader.fieldnames == ["stop_id", "stop_name", "latitude", "longitude"]
        result = list(reader)
    assert [(row["stop_id"], row["stop_name"]) for row in result] == [
        (row[1], row[2]) for row in rows[:3]
    ]
    assert all(
        35.4 <= float(row["latitude"]) <= 35.85
        and 127.0 <= float(row["longitude"]) <= 127.5
        for row in result
    )


def test_filter_rejects_all_stops_outside_bbox(tmp_path, monkeypatch):
    """임실군 정류장도 모두 bbox 밖이면 결과 파일을 생성하지 않는다."""
    source = tmp_path / "national_bus_stops.csv"
    output = tmp_path / "bus_stops_imsil.csv"
    source.write_text(
        "도시명,정류장번호,정류장명,위도,경도\n"
        "전라북도 임실군,00123,범위 밖,36.0,127.2\n",
        encoding="cp949",
    )
    monkeypatch.setattr(filter_imsil_bus_stop, "SRC_FILE", source)
    monkeypatch.setattr(filter_imsil_bus_stop, "OUT_FILE", output)

    with pytest.raises(SystemExit) as error:
        filter_imsil_bus_stop.main()

    assert error.value.code == 1
    assert not output.exists()
