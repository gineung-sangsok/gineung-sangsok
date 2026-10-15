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
