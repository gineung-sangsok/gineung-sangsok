"""기능별 상속안 추천.

폐업 예정 가게가 하던 기능(F01~F04)마다 같은 기능을 하는 마을 자원을 후보로 모으고,
5가지 점수(거리·운영 시간·배달·교통·생활권)의 가중합으로 순위를 매긴다.

데이터 한계 (docs/experiments/inheritance_scoring.md):
  - 운영 시간 데이터가 없는 후보는 hours를 중간값으로 두고 담당자 확인을 요구한다.
  - 이동장터(R01)는 실제 노선이 없어 면 단위 가정 노선으로 두고 항상 담당자 확인을 요구한다.
"""

from dataclasses import dataclass, field
from math import asin, cos, radians, sin, sqrt

CONFIRM = 0.6  # 태그 확정
CHECK = 0.4  # 확인 필요 하한 (이보다 낮은 태그는 후보로 보지 않는다)
MIN_SCORE = 0.45  # 이보다 낮으면 이어받을 곳이 없다고 본다

WEIGHTS = {
    "distance": 0.35, "hours": 0.1, "delivery": 0.15, "transport": 0.15, "service_area": 0.25,
}

MAX_KM = 10.0  # 이 거리부터 distance 0
STOP_NEAR_M, STOP_FAR_M = 300, 2000  # 정류장이 이 안이면 transport 1, 이 밖이면 0

HOURS_UNKNOWN = 0.5  # 운영 시간 정보가 없을 때 (담당자 확인 대상)
MOBILE_MARKET_HOURS = 0.3  # 주 1회 방문

# 이동장터는 생필품·신선식품을 판다 (taxonomy R01)
MOBILE_MARKET_FUNCTIONS = ("F01", "F02")

ACTIONS = {
    "R01": "이동장터 노선에 {ri} 정차 추가 검토",
    "R02": "{name} 전화 주문·배송 연계 검토",
    "R03": "{name}을 공동수령·안부 확인 거점으로 활용",
    "R04": "{name} 생활지원 서비스와 연계",
    "R05": "{name} 이용 안내 (가까운 대체 구매처)",
}
FACTOR_LABEL = {
    "distance": "가까움",
    "hours": "운영 시간",
    "delivery": "배달 가능",
    "transport": "버스 접근성",
    "service_area": "같은 생활권",
}


@dataclass
class Place:
    """폐업 가게 또는 후보 자원의 위치 정보."""

    entity_id: str
    name: str
    village_id: str
    village_name: str
    eup_myeon: str
    lat: float | None
    lng: float | None


@dataclass
class Candidate(Place):
    resource_type: str  # R01~R05
    # 기능 코드 → (confidence, 근거)
    tags: dict[str, tuple[float, str]] = field(default_factory=dict)
    stop_m: float | None = None  # 후보가 있는 법정리의 가까운 정류장까지 거리
    mobile_market: bool = False
    hours: float | None = None  # 운영 시간 점수 (0~1). 정보가 없으면 None


@dataclass
class Plan:
    function_code: str
    candidate: Candidate
    score: float
    breakdown: dict[str, float]
    distance_km: float | None
    needs_officer_check: bool
    action: str
    reason: str


def haversine_km(a: Place, b: Place) -> float | None:
    if None in (a.lat, a.lng, b.lat, b.lng):
        return None
    lat1, lng1, lat2, lng2 = map(radians, (a.lat, a.lng, b.lat, b.lng))
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lng2 - lng1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(h))


def clamp(v: float) -> float:
    return round(max(0.0, min(1.0, v)), 2)


def breakdown(code: str, target: Place, c: Candidate) -> tuple[dict[str, float], float | None]:
    km = None if c.mobile_market else haversine_km(target, c)
    if c.mobile_market:
        distance = 1.0  # 마을로 찾아온다
    elif km is None:
        distance = 0.3
    else:
        distance = 1 - km / MAX_KM

    f03 = c.tags.get("F03", (0.0, ""))[0]
    delivery = 1.0 if c.mobile_market or c.resource_type == "R02" or f03 >= CHECK else 0.0

    if c.mobile_market:
        transport = 1.0  # 주민이 이동할 필요가 없다
    elif c.stop_m is None:
        transport = 0.3
    else:
        transport = 1 - (c.stop_m - STOP_NEAR_M) / (STOP_FAR_M - STOP_NEAR_M)

    if c.village_id and c.village_id == target.village_id:
        service_area = 1.0
    elif c.eup_myeon and c.eup_myeon == target.eup_myeon:
        service_area = 0.8 if c.mobile_market else 0.7
    else:
        service_area = 0.3

    scores = {
        "distance": distance,
        "hours": HOURS_UNKNOWN if c.hours is None else c.hours,
        "delivery": delivery,
        "transport": transport,
        "service_area": service_area,
    }
    return {k: clamp(v) for k, v in scores.items()}, km


def make_reason(
    code: str, target: Place, c: Candidate, b: dict[str, float], km: float | None
) -> str:
    good = [FACTOR_LABEL[k] for k, v in sorted(b.items(), key=lambda kv: -kv[1]) if v >= 0.7][:3]
    area = b["service_area"]
    where = "같은 마을" if area == 1.0 else ("같은 면" if area >= 0.7 else "다른 면")
    dist = "마을로 직접 찾아오는 이동 자원" if c.mobile_market else (
        f"폐업 가게에서 약 {km:.1f}km" if km is not None else "위치 확인 필요"
    )
    conf, evidence = c.tags.get(code, (0.0, ""))
    parts = [f"{c.name}은(는) {dist}, {where} 생활권이다."]
    if good:
        parts.append(f"강점: {', '.join(good)}.")
    if c.mobile_market:
        parts.append("실제 노선 데이터가 없어 가정 노선 기준이며 운행 여부 확인이 필요하다.")
    elif conf < CONFIRM:
        parts.append("이 기능을 제공하는지 확실하지 않아 담당자 확인이 필요하다.")
    if c.hours is None:
        parts.append("운영 시간 정보가 없어 확인이 필요하다.")
    if evidence:
        parts.append(f"근거: {evidence}")
    return " ".join(parts)


def score_candidate(code: str, target: Place, c: Candidate) -> Plan | None:
    conf = c.tags.get(code, (0.0, ""))[0]
    if conf < CHECK:
        return None
    if c.mobile_market and c.eup_myeon != target.eup_myeon:
        return None  # 다른 면 노선은 이 마을에 오지 않는다
    b, km = breakdown(code, target, c)
    score = round(sum(WEIGHTS[k] * v for k, v in b.items()), 2)
    return Plan(
        function_code=code,
        candidate=c,
        score=score,
        breakdown=b,
        distance_km=km,
        needs_officer_check=c.mobile_market or conf < CONFIRM or c.hours is None,
        action=ACTIONS[c.resource_type].format(name=c.name, ri=target.village_name or "해당 마을"),
        reason=make_reason(code, target, c, b, km),
    )


def recommend(
    target: Place, functions: dict[str, float], candidates: list[Candidate], top_k: int = 1
) -> tuple[list[Plan], list[str]]:
    """기능마다 점수 상위 top_k개 상속안과, 이어받을 곳이 없는 기능 목록을 돌려준다.

    functions: 폐업 가게의 기능 코드 → confidence (CHECK 미만은 무시)
    """
    plans: list[Plan] = []
    uncovered: list[str] = []
    for code in sorted(c for c, conf in functions.items() if conf >= CHECK):
        scored = [
            p for c in candidates
            if c.entity_id != target.entity_id and (p := score_candidate(code, target, c))
        ]
        scored = sorted((p for p in scored if p.score >= MIN_SCORE), key=lambda p: -p.score)
        if scored:
            plans.extend(scored[:top_k])
        else:
            uncovered.append(code)
    return plans, uncovered


def mobile_market_candidates(markets: list[dict], villages: dict[str, Place]) -> list[Candidate]:
    """면 단위 이동장터 운행 정보 → 면마다 가정 노선 후보 하나."""
    result = []
    for m in markets:
        if str(m.get("mobile_market_active")).lower() != "true":
            continue
        eup = m["eup_myeon"]
        result.append(Candidate(
            entity_id=f"mobile_market_{eup}",
            name=f"임실 이동장터 ({eup} 가정 노선, {m.get('visit_frequency') or '주기 미정'})",
            village_id="",
            village_name="",
            eup_myeon=eup,
            lat=None,
            lng=None,
            resource_type="R01",
            tags={code: (CONFIRM, "보도 기준 면 단위 운행") for code in MOBILE_MARKET_FUNCTIONS},
            mobile_market=True,
            hours=MOBILE_MARKET_HOURS,
        ))
    return result
