"""상속안 추천 점수·선택 규칙과 /inheritance API를 확인한다."""

from fastapi.testclient import TestClient

from backend.main import app
from track2_recommend import recommend as rec

TARGET = rec.Place("s0", "폐업가게", "V1", "일중리", "덕치면", 35.50, 127.15)


def cand(eid, *, village="V1", eup="덕치면", lat=35.50, lng=127.15, rtype="R05", tags=None,
         stop_m=300, mobile=False, hours=0.8):
    return rec.Candidate(eid, eid, village, "", eup, lat, lng, rtype, tags or {}, stop_m, mobile,
                         hours)


def test_score_is_weighted_sum_of_breakdown():
    plans, _ = rec.recommend(TARGET, {"F01": 0.9}, [cand("a", tags={"F01": (0.9, "")})])
    p = plans[0]
    assert all(0 <= v <= 1 for v in p.breakdown.values())
    assert p.score == round(sum(rec.WEIGHTS[k] * v for k, v in p.breakdown.items()), 2)


def test_nearer_same_village_candidate_wins():
    near = cand("near", tags={"F02": (0.9, "")})
    far = cand("far", village="V9", eup="관촌면", lat=35.60, lng=127.25, tags={"F02": (0.9, "")})
    plans, _ = rec.recommend(TARGET, {"F02": 0.8}, [far, near])
    assert plans[0].candidate.entity_id == "near"


def test_uncertain_tag_needs_officer_check_and_low_tags_are_ignored():
    plans, uncovered = rec.recommend(
        TARGET, {"F01": 0.9, "F03": 0.9},
        [cand("maybe", tags={"F01": (0.5, "")}), cand("no", tags={"F03": (0.3, "")})],
    )
    assert plans[0].needs_officer_check is True
    assert uncovered == ["F03"]


def test_unknown_hours_scores_half_and_needs_officer_check():
    plans, _ = rec.recommend(TARGET, {"F01": 0.9}, [cand("a", tags={"F01": (0.9, "")}, hours=None)])
    assert plans[0].breakdown["hours"] == rec.HOURS_UNKNOWN
    assert plans[0].needs_officer_check is True
    known, _ = rec.recommend(TARGET, {"F01": 0.9}, [cand("b", tags={"F01": (0.9, "")})])
    assert known[0].needs_officer_check is False


def test_mobile_market_only_serves_its_own_eup_myeon():
    markets = rec.mobile_market_candidates(
        [{"eup_myeon": "관촌면", "mobile_market_active": True, "visit_frequency": "주 1회"}], {}
    )
    _, uncovered = rec.recommend(TARGET, {"F01": 0.9}, markets)
    assert uncovered == ["F01"]


def test_skips_the_closing_store_itself():
    _, uncovered = rec.recommend(TARGET, {"F01": 0.9}, [cand("s0", tags={"F01": (0.9, "")})])
    assert uncovered == ["F01"]


def test_inheritance_api_follows_officer_edits():
    client = TestClient(app)
    created = client.post("/closures", json={"store_id": "store_0107"}).json()
    cid = created["closure_id"]
    before = client.get(f"/closures/{cid}/inheritance").json()
    assert before["closure_id"] == cid
    assert before["plans"] and all(0 <= p["score"] <= 1 for p in before["plans"])

    only_f04 = [{"code": "F04", "confidence": 1, "evidence": "담당자 확인", "source": "manual"}]
    client.patch(f"/closures/{cid}/functions", json={"functions": only_f04})
    after = client.get(f"/closures/{cid}/inheritance").json()
    covered = {p["function_code"] for p in after["plans"]} | set(after["uncovered_functions"])
    assert covered == {"F04"}
