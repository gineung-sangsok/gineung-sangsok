"""백엔드 엔드포인트가 계약 형식대로 응답하는지 확인한다."""

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)
DEMO = "closure_0001"


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_demo_closure_endpoints():
    functions = client.get(f"/closures/{DEMO}/functions")
    assert functions.status_code == 200
    assert {f["code"] for f in functions.json()["functions"]} >= {"F01", "F02"}

    inheritance = client.get(f"/closures/{DEMO}/inheritance").json()
    assert inheritance["plans"][0]["score_breakdown"].keys() == {
        "distance", "hours", "delivery", "transport", "service_area"
    }

    gap = client.get(f"/closures/{DEMO}/gap").json()
    assert gap["summary"]["gap_population_after"] <= gap["summary"]["gap_population_before"]


def test_patch_marks_verified():
    body = {"functions": [{"code": "F01", "confidence": 1, "evidence": "담당자 확인",
                           "source": "manual"}]}
    res = client.patch(f"/closures/{DEMO}/functions", json=body)
    assert res.status_code == 200
    assert res.json()["verified_by_officer"] is True


def test_create_closure_unknown_store_uses_error_format():
    res = client.post("/closures", json={"store_id": "store_9999"})
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "STORE_NOT_FOUND"


def test_unknown_closure_uses_error_format():
    res = client.get("/closures/closure_9999/gap")
    assert res.status_code == 404
    assert res.json() == {
        "error": {"code": "CLOSURE_NOT_FOUND", "message": "closure_9999를 찾을 수 없습니다."}
    }


def test_map_endpoints():
    resources = client.get("/resources").json()
    assert resources and all("location" in r for r in resources)
    r03 = client.get("/resources", params={"resource_type": "R03"}).json()
    assert all(r["resource_type"] == "R03" for r in r03)
    villages = client.get("/villages").json()
    assert villages and len(villages[0]["village_id"]) == 10


def test_cors_allows_vite_dev_server():
    res = client.options(
        "/villages",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_concurrent_creates_get_unique_ids():
    from concurrent.futures import ThreadPoolExecutor

    from backend.store import ClosureStore, stores_by_id

    closures_ = ClosureStore()
    demo_store = next(iter(stores_by_id().values()))
    with ThreadPoolExecutor(8) as pool:
        created = list(pool.map(lambda _: closures_.create(demo_store, None, None), range(50)))
    ids = {c.closure_id for c in created}
    assert len(ids) == 50
    assert all(closure_id in closures_.closures for closure_id in ids)


def test_stores_with_blank_village_and_location(tmp_path, monkeypatch):
    from backend import store

    (tmp_path / "stores_imsil.csv").write_text(
        "entity_id,name,village_id,lat,lng,status\n"
        "store_0001,정상,5275040026,35.48,127.14,ACTIVE\n"
        "store_0002,좌표없음,,,,ACTIVE\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(store, "PROCESSED", tmp_path)
    store.stores_by_id.cache_clear()
    try:
        stores = store.stores_by_id()
        assert stores["store_0002"].village_id == ""
        assert stores["store_0002"].location is None
        assert stores["store_0001"].location.lat == 35.48
    finally:
        store.stores_by_id.cache_clear()


def test_demo_functions_come_from_tagging():
    from backend.store import ClosureStore

    # 다른 테스트의 PATCH가 앱의 데모 건을 바꾸므로 새 저장소로 확인한다
    functions = ClosureStore().get_functions(DEMO).functions
    by_code = {f.code: f.source for f in functions}
    assert by_code == {"F01": "llm", "F02": "llm", "F03": "llm", "F04": "keyword"}


def test_create_closure_attaches_store_tags():
    from backend.store import stores_by_id, tags_by_entity

    store_id = next(eid for eid in stores_by_id() if eid in tags_by_entity())
    closure = client.post("/closures", json={"store_id": store_id}).json()
    functions = client.get(f"/closures/{closure['closure_id']}/functions").json()
    assert functions["functions"] == [t.model_dump() for t in tags_by_entity()[store_id]]
    assert functions["verified_by_officer"] is False


def test_tags_pick_llm_f01_f03_and_keyword_f04(tmp_path, monkeypatch):
    from backend import store

    header = "entity_id,code,confidence,evidence,source\n"
    (tmp_path / "tagging_llm.csv").write_text(
        header + "store_0001,F01,0.9,llm 근거,llm\nstore_0001,F04,0.5,llm 거점,llm\n",
        encoding="utf-8",
    )
    (tmp_path / "tagging_keyword.csv").write_text(
        header + "store_0001,F01,0.9,업종,keyword\nstore_0001,F04,0.5,1곳뿐,keyword\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(store, "PROCESSED", tmp_path)
    store.tags_by_entity.cache_clear()
    try:
        tags = store.functions_for("store_0001")
        assert [(t.code, t.source) for t in tags] == [("F01", "llm"), ("F04", "keyword")]
        assert store.functions_for("store_9999") == []
    finally:
        store.tags_by_entity.cache_clear()


def test_functions_fall_back_to_mock_without_tagging_files(tmp_path, monkeypatch):
    from backend import store

    monkeypatch.setattr(store, "PROCESSED", tmp_path)
    store.tags_by_entity.cache_clear()
    try:
        assert {t.code for t in store.functions_for("store_0107")} == {"F01", "F02", "F03", "F04"}
    finally:
        store.tags_by_entity.cache_clear()
