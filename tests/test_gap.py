"""상속 전후 공백 판정과 /gap API를 확인한다."""

from fastapi.testclient import TestClient

from backend.main import app
from track2_recommend import gap
from track2_recommend import recommend as rec

# 위도 0.009° ≈ 1km
STORE = rec.Place("s0", "폐업가게", "V1", "가리", "가면", 35.500, 127.150)
HOME = gap.Village("V1", "가리", "V1", "가리", "가면", 35.500, 127.150, population=100)
NEIGHBOR = gap.Village("V2", "나리", "V2", "나리", "가면", 35.505, 127.150, population=40)


def provider(eid, lat, code="F01", mobile=False):
    return rec.Candidate(eid, eid, "", "", "가면", lat, 127.150, "R01" if mobile else "R05",
                         {code: (0.9, "")}, 300, mobile, 0.8)


def run(candidates, functions=None):
    functions = functions or {"F01": 0.9}
    plans, _ = rec.recommend(STORE, functions, candidates)
    return gap.compute_gap(STORE, functions, candidates, [HOME, NEIGHBOR], plans)


def test_far_replacement_leaves_gap():
    records, before, after = run([provider("far", 35.530)])  # 약 3.3km
    home = next(r for r in records if r.village_id == "V1")
    assert home.before.provider_ids == ["s0"]
    assert home.gap is True
    assert before == after == 140


def test_near_replacement_closes_gap():
    records, before, after = run([provider("near", 35.503)])  # 약 0.3km
    assert all(r.gap is False for r in records)
    assert before == 0 and after == 0


def test_mobile_market_partly_closes_f01_but_not_f02():
    market = rec.mobile_market_candidates(
        [{"eup_myeon": "가면", "mobile_market_active": True, "visit_frequency": "주 1회"}], {}
    )
    records, before, after = run(market, {"F01": 0.9, "F02": 0.9})
    by_code = {r.function_code: r for r in records if r.village_id == "V1"}
    assert by_code["F01"].gap is False and by_code["F01"].after.distance_m == 0
    assert by_code["F02"].gap is True
    assert after < before


def test_village_not_served_by_store_is_skipped():
    other = provider("other", 35.506)  # 나리 바로 옆
    records, _, _ = run([other])
    assert {r.village_id for r in records} == {"V1"}


def test_gap_api_after_never_exceeds_before():
    client = TestClient(app)
    res = client.get("/closures/closure_0001/gap").json()
    assert res["villages"]
    assert res["summary"]["gap_population_after"] <= res["summary"]["gap_population_before"]
