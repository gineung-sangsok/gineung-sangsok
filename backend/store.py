"""데이터 접근 계층. 지금은 목업 JSON과 data/processed/ 파일을 읽는다.

실제 태깅(track1_tagging)·추천(track2_recommend) 결과가 나오면 이 모듈만 바꾸고
라우터와 응답 형식은 그대로 둔다.
"""

import json
import threading
from functools import cache
from pathlib import Path

import pandas as pd

from .schemas import (
    Closure,
    ClosureFunctions,
    Entity,
    FunctionTag,
    Gap,
    Inheritance,
    Location,
    Population,
    Village,
)

BASE_DIR = Path(__file__).resolve().parents[1]
MOCK_DIR = BASE_DIR / "docs" / "contracts" / "mock"
PROCESSED = BASE_DIR / "data" / "processed"


def _mock(name: str) -> dict | list:
    return json.loads((MOCK_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _num(value):
    return None if pd.isna(value) else value


def _text(value) -> str:
    """CSV 빈칸(NaN)을 빈 문자열로 바꾼다. 지오코딩 실패 행은 village_id가 비어 있다."""
    return "" if pd.isna(value) else str(value)


def _location(lat, lng) -> Location | None:
    return None if pd.isna(lat) or pd.isna(lng) else Location(lat=lat, lng=lng)


@cache
def resources() -> list[Entity]:
    """data/processed/resources_imsil.csv가 있으면 그것을, 없으면 목업을 쓴다."""
    path = PROCESSED / "resources_imsil.csv"
    if not path.exists():
        return [Entity(**item) for item in _mock("resources")]
    df = pd.read_csv(path, dtype={"village_id": str, "source_id": str})
    return [
        Entity(
            entity_id=row.entity_id,
            entity_type="resource",
            resource_type=row.resource_type,
            name=row.name,
            village_id=_text(row.village_id),
            location=_location(row.lat, row.lng),
            status=row.status,
        )
        for row in df.itertuples()
    ]


@cache
def villages() -> list[Village]:
    """data/processed/villages_ri.csv가 있으면 그것을, 없으면 목업을 쓴다."""
    path = PROCESSED / "villages_ri.csv"
    if not path.exists():
        return [Village(**item) for item in _mock("villages")]
    df = pd.read_csv(path, dtype={"ri_code": str})
    return [
        Village(
            village_id=row.ri_code,
            ri_name=row.ri_name,
            eup_myeon=row.eup_myeon,
            rep_point=Location(lat=row.center_lat, lng=row.center_lng),
            population=Population(
                total=_num(row.total_pop),
                age65plus=_num(row.pop_65plus),
                aging_rate=_num(row.aging_rate),
                source=_num(row.pop_source),
                year=_num(row.pop_year),
            ),
            nearest_bus_stop_m=_num(row.nearest_stop_m),
        )
        for row in df.itertuples()
    ]


class ClosureStore:
    """폐업 등록·담당자 수정 내역을 메모리에 보관한다. (추후 SQLite)

    데모용으로 closure_0001이 미리 등록돼 있어 B가 POST 없이 GET을 바로 호출할 수 있다.
    """

    def __init__(self) -> None:
        # FastAPI는 일반 함수 엔드포인트를 스레드풀에서 동시에 실행하므로 ID 발급·저장을 잠근다
        self._lock = threading.Lock()
        demo = _mock("closure")
        self.closures: dict[str, Closure] = {demo["closure_id"]: Closure(**demo)}
        functions = _mock("functions")
        self.functions: dict[str, ClosureFunctions] = {
            functions["closure_id"]: ClosureFunctions(**functions)
        }

    def create(self, store: Entity, closure_date: str | None, note: str | None) -> Closure:
        store = store.model_copy(update={"status": "CLOSING", "closure_date": closure_date})
        # 태깅 연결 전까지는 데모 기능 분리 결과를 그대로 붙인다
        demo = _mock("functions")
        with self._lock:
            closure_id = f"closure_{len(self.closures) + 1:04d}"
            closure = Closure(
                closure_id=closure_id, store=store, closure_date=closure_date, note=note
            )
            self.closures[closure_id] = closure
            self.functions[closure_id] = ClosureFunctions(
                closure_id=closure_id,
                functions=demo["functions"],
                verified_by_officer=False,
            )
        return closure

    def get(self, closure_id: str) -> Closure | None:
        return self.closures.get(closure_id)

    def get_functions(self, closure_id: str) -> ClosureFunctions:
        return self.functions[closure_id]

    def update_functions(self, closure_id: str, functions: list[FunctionTag]) -> ClosureFunctions:
        updated = ClosureFunctions(
            closure_id=closure_id, functions=functions, verified_by_officer=True
        )
        self.functions[closure_id] = updated
        return updated

    def inheritance(self, closure_id: str) -> Inheritance:
        return Inheritance(**{**_mock("inheritance"), "closure_id": closure_id})

    def gap(self, closure_id: str) -> Gap:
        return Gap(**{**_mock("gap"), "closure_id": closure_id})


@cache
def stores_by_id() -> dict[str, Entity]:
    """폐업 등록 시 store_id로 가게를 찾는다."""
    path = PROCESSED / "stores_imsil.csv"
    if not path.exists():
        demo = Closure(**_mock("closure")).store
        return {demo.entity_id: demo.model_copy(update={"status": "ACTIVE"})}
    df = pd.read_csv(path, dtype={"village_id": str, "source_id": str})
    return {
        row.entity_id: Entity(
            entity_id=row.entity_id,
            entity_type="store",
            name=row.name,
            village_id=_text(row.village_id),
            location=_location(row.lat, row.lng),
            status=row.status,
        )
        for row in df.itertuples()
    }
