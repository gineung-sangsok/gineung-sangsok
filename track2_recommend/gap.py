"""상속 전후 공백 변화.

폐업 가게가 기능별로 가장 가까운 제공처였던 법정리(영향 마을)마다
  - before: 지금(폐업 전) 제공처와 거리
  - after: 폐업 후 상속안을 반영했을 때 제공처와 거리, 공백 여부
를 계산하고, 기능별 공백 인구의 평균을 상속안이 없을 때와 있을 때로 비교한다.
(어느 기능 하나라도 공백인 마을로 세면 일부 기능만 해소돼도 숫자가 그대로라 변화가 보이지 않는다)

판정 기준 (docs/contracts/spatial_schema.md 임시값, docs/experiments/gap_calc.md):
  - 제공처까지 1km 초과 → 공백
  - 이동장터가 오면 부분 해소. 단 F02(신선식품)는 판매 품목 확인 전까지 공백으로 본다.
거리는 법정리 대표점과 제공처 사이 직선거리다.
"""

from dataclasses import dataclass

from track2_recommend.recommend import CHECK, Candidate, Place, Plan, haversine_km

GAP_M = 1000


@dataclass
class Village(Place):
    population: int = 0


@dataclass
class Access:
    provider_ids: list[str]
    distance_m: float | None
    note: str | None = None


@dataclass
class VillageGap:
    village_id: str
    function_code: str
    before: Access
    after: Access
    gap: bool


def _meters(a: Place, b: Place) -> float | None:
    km = haversine_km(a, b)
    return None if km is None else round(km * 1000)


def _nearest(v: Village, providers: list[Candidate]) -> tuple[Candidate | None, float | None]:
    best, best_m = None, None
    for p in providers:
        m = _meters(v, p)
        if m is not None and (best_m is None or m < best_m):
            best, best_m = p, m
    return best, best_m


def _far(m: float | None) -> bool:
    return m is None or m > GAP_M


def compute_gap(
    store: Place,
    functions: dict[str, float],
    candidates: list[Candidate],
    villages: list[Village],
    plans: list[Plan],
) -> tuple[list[VillageGap], int, int]:
    """(마을·기능별 공백 기록, 상속안이 없을 때 공백 인구, 상속안 반영 후 공백 인구).

    공백 인구 = 기능마다 공백인 법정리 인구를 더한 뒤 기능 수로 나눈 평균 (반올림).
    """
    plan_by_code = {p.function_code: p for p in plans}
    records: list[VillageGap] = []
    pop = {v.village_id: v.population for v in villages}
    codes = sorted(c for c, conf in functions.items() if conf >= CHECK)
    without_total = with_total = 0  # 기능별 공백 인구의 합 (상속안 없음 / 반영 후)

    for code in codes:
        others = [
            c for c in candidates
            if not c.mobile_market and c.entity_id != store.entity_id
            and c.tags.get(code, (0.0, ""))[0] >= CHECK
        ]
        plan = plan_by_code.get(code)
        for v in villages:
            store_m = _meters(v, store)
            rest, rest_m = _nearest(v, others)
            # 폐업 가게가 이 마을에서 가장 가까운 제공처였을 때만 영향 마을이다
            if v.village_id != store.village_id and (
                store_m is None or (rest_m is not None and rest_m <= store_m)
            ):
                continue

            if _far(rest_m):
                without_total += pop[v.village_id]

            ids = [rest.entity_id] if rest else []
            after_m, note, gap = rest_m, "상속안 없음 · 남은 가장 가까운 제공처", _far(rest_m)
            if plan:
                c = plan.candidate
                if c.mobile_market:
                    ids = [c.entity_id, *ids]
                    after_m = 0
                    if code == "F02":
                        # 판매 품목 확인 전에는 이동장터를 신선식품 제공처로 치지 않는다
                        note = "이동장터 방문 · 신선식품 판매 품목 확인 전까지 미해소 (가정 노선)"
                    else:
                        note = "이동장터 주 1회 방문 (부분 해소, 가정 노선 확인 필요)"
                        gap = False
                else:
                    ids = [c.entity_id, *(i for i in ids if i != c.entity_id)]
                    dists = [m for m in (_meters(v, c), rest_m) if m is not None]
                    after_m = min(dists) if dists else None
                    gap = _far(after_m)
                    note = "상속안 자원"
                    if gap and c.resource_type == "R02":
                        note += " · 배송 연계 시 해소 가능"
            if gap:
                with_total += pop[v.village_id]

            records.append(VillageGap(
                village_id=v.village_id,
                function_code=code,
                before=Access([store.entity_id], store_m),
                after=Access(ids, after_m, note),
                gap=gap,
            ))

    n = len(codes) or 1
    return records, round(without_total / n), round(with_total / n)
