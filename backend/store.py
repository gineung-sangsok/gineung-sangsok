"""데이터 접근 계층. 지금은 목업 JSON과 data/processed/ 파일을 읽는다.

실제 태깅(track1_tagging)·추천(track2_recommend) 결과가 나오면 이 모듈만 바꾸고
라우터와 응답 형식은 그대로 둔다.
"""

import json
import threading
from functools import cache
from pathlib import Path

import pandas as pd

from track2_recommend import gap as gap_calc
from track2_recommend import recommend as rec

from .schemas import (
    Access,
    Closure,
    ClosureFunctions,
    Entity,
    FunctionTag,
    Gap,
    GapSummary,
    Inheritance,
    InheritancePlan,
    Location,
    Population,
    ScoreBreakdown,
    Village,
    VillageGap,
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
            functions=functions_for(row.entity_id),
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


# F01~F03은 LLM, F04는 키워드 규칙(법정리 식료품점 수)을 쓴다.
# 근거: docs/experiments/tagging_prompt.md
TAG_SOURCES = {"llm": ["F01", "F02", "F03"], "keyword": ["F04"]}


@cache
def tags_by_entity() -> dict[str, list[FunctionTag]] | None:
    """data/processed/tagging_{llm,keyword}.csv를 entity_id별 기능 태그로 묶는다. 없으면 None."""
    paths = {method: PROCESSED / f"tagging_{method}.csv" for method in TAG_SOURCES}
    if not all(path.exists() for path in paths.values()):
        return None
    df = pd.concat(
        pd.read_csv(paths[method]).query("code in @codes")
        for method, codes in TAG_SOURCES.items()
    ).sort_values(["entity_id", "code"])
    return {
        entity_id: [
            FunctionTag(code=row.code, confidence=row.confidence, evidence=_text(row.evidence),
                        source=row.source)
            for row in group.itertuples()
        ]
        for entity_id, group in df.groupby("entity_id")
    }


def functions_for(entity_id: str) -> list[FunctionTag]:
    """가게의 태깅 결과. 태깅 파일이 없으면 데모 결과를, 태그가 없는 가게는 빈 목록을 준다."""
    tags = tags_by_entity()
    if tags is None:
        return [FunctionTag(**item) for item in _mock("functions")["functions"]]
    return tags.get(entity_id, [])


class ClosureStore:
    """폐업 등록·담당자 수정 내역을 메모리에 보관한다. (추후 SQLite)

    데모용으로 closure_0001이 미리 등록돼 있어 B가 POST 없이 GET을 바로 호출할 수 있다.
    """

    def __init__(self) -> None:
        # FastAPI는 일반 함수 엔드포인트를 스레드풀에서 동시에 실행하므로 ID 발급·저장을 잠근다
        self._lock = threading.Lock()
        demo = _mock("closure")
        self.closures: dict[str, Closure] = {demo["closure_id"]: Closure(**demo)}
        self.functions: dict[str, ClosureFunctions] = {
            demo["closure_id"]: ClosureFunctions(
                closure_id=demo["closure_id"],
                functions=functions_for(demo["store"]["entity_id"]),
                verified_by_officer=False,
            )
        }

    def create(self, store: Entity, closure_date: str | None, note: str | None) -> Closure:
        store = store.model_copy(update={"status": "CLOSING", "closure_date": closure_date})
        functions = functions_for(store.entity_id)
        with self._lock:
            closure_id = f"closure_{len(self.closures) + 1:04d}"
            closure = Closure(
                closure_id=closure_id, store=store, closure_date=closure_date, note=note
            )
            self.closures[closure_id] = closure
            self.functions[closure_id] = ClosureFunctions(
                closure_id=closure_id,
                functions=functions,
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
        """담당자가 확인한(없으면 AI) 기능 목록으로 상속안을 계산한다. 데이터가 없으면 목업."""
        computed = self._recommend(closure_id)
        if computed is None:
            return Inheritance(**{**_mock("inheritance"), "closure_id": closure_id})
        _, _, plans, uncovered = computed
        return Inheritance(
            closure_id=closure_id,
            plans=[
                InheritancePlan(
                    function_code=p.function_code,
                    resource_id=p.candidate.entity_id,
                    resource_type=p.candidate.resource_type,
                    resource_name=p.candidate.name,
                    action=p.action,
                    score=p.score,
                    score_breakdown=ScoreBreakdown(**p.breakdown),
                    reason=p.reason,
                    needs_officer_check=p.needs_officer_check,
                )
                for p in plans
            ],
            uncovered_functions=uncovered,
        )

    def gap(self, closure_id: str) -> Gap:
        """상속 전후 공백 변화. 데이터가 없으면 목업."""
        computed = self._recommend(closure_id)
        villages = gap_villages()
        if computed is None or villages is None:
            return Gap(**{**_mock("gap"), "closure_id": closure_id})
        target, functions, plans, _ = computed
        records, pop_before, pop_after = gap_calc.compute_gap(
            target, functions, recommend_candidates(), villages, plans
        )
        return Gap(
            closure_id=closure_id,
            villages=[
                VillageGap(
                    village_id=r.village_id,
                    function_code=r.function_code,
                    before=Access(**vars(r.before)),
                    after=Access(**vars(r.after)),
                    gap=r.gap,
                )
                for r in records
            ],
            summary=GapSummary(gap_population_before=pop_before, gap_population_after=pop_after),
        )

    def _recommend(self, closure_id: str):
        """(폐업 가게 위치, 기능 목록, 상속안, 이어받을 곳 없는 기능). 데이터가 없으면 None.

        기능 목록은 담당자가 확인·수정한 값이 있으면 그것을, 없으면 AI 결과를 쓴다.
        """
        candidates = recommend_candidates()
        places = village_places()
        if candidates is None or places is None:
            return None
        store = self.closures[closure_id].store
        village = places.get(store.village_id)
        target = rec.Place(
            entity_id=store.entity_id,
            name=store.name,
            village_id=store.village_id,
            village_name=village.village_name if village else "",
            eup_myeon=village.eup_myeon if village else "",
            lat=store.location.lat if store.location else None,
            lng=store.location.lng if store.location else None,
        )
        functions = {t.code: t.confidence for t in self.functions[closure_id].functions}
        plans, uncovered = rec.recommend(target, functions, candidates)
        return target, functions, plans, uncovered


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
            functions=functions_for(row.entity_id),
        )
        for row in df.itertuples()
    }


@cache
def village_places() -> dict[str, rec.Place] | None:
    """법정리 코드 → 이름·읍면·대표점. villages_ri.csv가 없으면 None."""
    path = PROCESSED / "villages_ri.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, dtype={"ri_code": str})
    return {
        row.ri_code: rec.Place(
            entity_id=row.ri_code, name=row.ri_name, village_id=row.ri_code,
            village_name=row.ri_name, eup_myeon=row.eup_myeon,
            lat=_num(row.center_lat), lng=_num(row.center_lng),
        )
        for row in df.itertuples()
    }


# 이름으로 농협·지역마트 배송(R02)을 가린다. 그 밖의 가게는 인근 상점(R05)
R02_NAME = ("하나로", "농협", "농업협동조합")


@cache
def recommend_candidates() -> list[rec.Candidate] | None:
    """상속 후보: 영업 중인 가게, 자원, 면 단위 이동장터. 필요한 파일이 없으면 None."""
    tags = tags_by_entity()
    places = village_places()
    paths = [PROCESSED / f for f in ("stores_imsil.csv", "resources_imsil.csv")]
    if tags is None or places is None or not all(p.exists() for p in paths):
        return None
    stops = {}
    access = PROCESSED / "accessibility_ri.csv"
    if access.exists():
        a = pd.read_csv(access, dtype={"ri_code": str})
        stops = dict(zip(a["ri_code"], a["nearest_stop_m"], strict=True))

    frames = [pd.read_csv(p, dtype={"village_id": str, "source_id": str}) for p in paths]
    df = pd.concat(frames)
    df = df[df["status"].isin(["ACTIVE", "SEASONAL"])]
    candidates = []
    for row in df.itertuples():
        vid = _text(row.village_id)
        village = places.get(vid)
        if row.entity_type == "store":
            rtype = "R02" if any(k in row.name for k in R02_NAME) else "R05"
        else:
            rtype = row.resource_type
        candidates.append(rec.Candidate(
            entity_id=row.entity_id, name=row.name, village_id=vid,
            village_name=village.village_name if village else _text(row.village_name),
            eup_myeon=village.eup_myeon if village else "",
            lat=_num(row.lat), lng=_num(row.lng),
            resource_type=rtype,
            tags={t.code: (t.confidence, t.evidence) for t in tags.get(row.entity_id, [])},
            stop_m=_num(stops.get(vid)),
        ))

    markets = PROCESSED / "mobile_market_imsil.csv"
    if markets.exists():
        rows = pd.read_csv(markets).to_dict("records")
        route_path = PROCESSED / "mobile_market_route_ri.csv"
        routes = (
            pd.read_csv(route_path, dtype={"ri_code": str}).to_dict("records")
            if route_path.exists() else []
        )
        candidates += rec.mobile_market_candidates(rows, places, routes)
    return candidates


@cache
def gap_villages() -> list[gap_calc.Village] | None:
    """공백 계산용 법정리: 대표점과 인구(total_pop, 없으면 0)."""
    path = PROCESSED / "villages_ri.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, dtype={"ri_code": str})
    return [
        gap_calc.Village(
            entity_id=row.ri_code, name=row.ri_name, village_id=row.ri_code,
            village_name=row.ri_name, eup_myeon=row.eup_myeon,
            lat=_num(row.center_lat), lng=_num(row.center_lng),
            population=0 if pd.isna(row.total_pop) else int(row.total_pop),
        )
        for row in df.itertuples()
    ]
