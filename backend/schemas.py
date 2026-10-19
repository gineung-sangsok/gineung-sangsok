"""API 요청·응답 모델. 필드명은 docs/contracts/ 계약 v1.0을 따른다."""

from typing import Literal

from pydantic import BaseModel, Field

FunctionCode = Literal["F01", "F02", "F03", "F04", "F05"]
ResourceType = Literal["R01", "R02", "R03", "R04", "R05"]
Status = Literal["ACTIVE", "CLOSING", "SEASONAL", "SUSPENDED", "CLOSED"]
Weekday = Literal["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


class Location(BaseModel):
    lat: float
    lng: float


class FunctionTag(BaseModel):
    code: FunctionCode
    confidence: float = Field(ge=0, le=1)
    evidence: str
    source: Literal["llm", "keyword", "manual"]


class Hours(BaseModel):
    open: str
    close: str


class Schedule(BaseModel):
    days: list[Weekday]
    hours: Hours | None = None


class Capacity(BaseModel):
    current: int
    max: int
    unit: str


class Conditions(BaseModel):
    """값이 null이면 '모름'이다 (false와 구분)."""

    schedule: Schedule | None = None
    weekly_visits: float | None = None
    capacity: Capacity | None = None
    delivery: bool | None = None
    service_area: list[str] | None = None
    requires_own_transport: bool | None = None


class Entity(BaseModel):
    """가게·자원 공통 태깅 결과."""

    entity_id: str
    entity_type: Literal["store", "resource"]
    resource_type: ResourceType | None = None
    name: str
    village_id: str
    location: Location | None
    functions: list[FunctionTag] = []
    status: Status = "ACTIVE"
    closure_date: str | None = None
    conditions: Conditions = Conditions()
    verified_by_officer: bool = False


# ① 등록
class ClosureCreate(BaseModel):
    store_id: str
    closure_date: str | None = Field(default=None, examples=["2026-11-30"])
    note: str | None = None


class Closure(BaseModel):
    closure_id: str
    store: Entity
    closure_date: str | None
    note: str | None = None


# ②③ 기능 분리·확인
class ClosureFunctions(BaseModel):
    closure_id: str
    functions: list[FunctionTag]
    verified_by_officer: bool


class FunctionsUpdate(BaseModel):
    functions: list[FunctionTag]


# ④ 상속안
class ScoreBreakdown(BaseModel):
    distance: float
    hours: float
    delivery: float
    transport: float
    service_area: float


class InheritancePlan(BaseModel):
    function_code: FunctionCode
    resource_id: str
    resource_type: ResourceType
    resource_name: str
    action: str
    score: float
    score_breakdown: ScoreBreakdown
    reason: str
    needs_officer_check: bool


class Inheritance(BaseModel):
    closure_id: str
    plans: list[InheritancePlan]
    uncovered_functions: list[FunctionCode]


# ⑤ 공백 변화
class Access(BaseModel):
    provider_ids: list[str]
    distance_m: float | None
    note: str | None = None


class VillageGap(BaseModel):
    village_id: str
    function_code: FunctionCode
    before: Access
    after: Access
    gap: bool


class GapSummary(BaseModel):
    gap_population_before: int
    gap_population_after: int


class Gap(BaseModel):
    closure_id: str
    villages: list[VillageGap]
    summary: GapSummary


# 지도
class Population(BaseModel):
    total: int | None
    age65plus: int | None
    aging_rate: float | None
    source: str | None
    year: int | None


class Village(BaseModel):
    village_id: str
    ri_name: str
    eup_myeon: str
    rep_point: Location
    population: Population
    nearest_bus_stop_m: float | None
    has_food_store: bool | None = None


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody
