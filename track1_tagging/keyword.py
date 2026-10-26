"""키워드 베이스라인: 업종·자원 종류와 이름 키워드로 기능을 붙인다.

LLM 태깅과 비교하는 기준선이다. 규칙은 일부러 단순하게 둔다.
"""

import pandas as pd

from track1_tagging.schema import FunctionTag, keep

# 업종(상가정보 소분류 / LOCALDATA) → (기능, confidence)
CATEGORY_RULES: dict[str, list[tuple[str, float]]] = {
    "슈퍼마켓": [("F01", 0.9), ("F02", 0.5)],
    "편의점": [("F01", 0.9)],
    "그 외 기타 종합 소매업": [("F01", 0.6)],
    "식품판매업(기타)": [("F01", 0.9), ("F02", 0.8), ("F03", 0.7)],  # 매장 300㎡ 이상 마트
    "반찬/식료품 소매업": [("F01", 0.6), ("F02", 0.6)],
    "채소/과일 소매업": [("F02", 0.9)],
    "정육점": [("F02", 0.9)],
    "수산물 소매업": [("F02", 0.9)],
    "건어물/젓갈 소매업": [("F01", 0.6)],
    "곡물/곡분 소매업": [("F03", 0.8)],
}

# 이름에 이 말이 있으면 규모 있는 마트로 본다
MART_WORDS = ["하나로마트", "농협", "마트", "에브리데이"]
MART_TAGS = [("F01", 0.9), ("F02", 0.8), ("F03", 0.7)]

# 이름에 이 말이 있으면 생필품 구매처가 아닐 가능성이 크다 → 모든 기능을 0.3으로 낮춘다
# (10/26 A·B 합의) 다이소·천원숍은 생활용품 F01이므로 목록에서 뺐다
NOT_GROCERY_WORDS = [
    "휴게소", "휴게실", "쉼터", "카페", "디저트", "아이스", "박물관", "매점", "구내식당",
    "바베큐", "산장", "주유소", "튀밥", "벌꿀", "농장",
]

# (10/26 A·B 합의) 치즈 특산물 판매장은 유제품이므로 F02만 준다
CHEESE_TAGS = [("F02", 0.6)]
# (10/26 A·B 합의) 휴게소 안 편의점은 상품은 팔지만 주민 접근이 어려워 F01을 확인 필요로 둔다
REST_AREA_STORE = ("F01", 0.5)

# 자원 종류 → (기능, confidence)
RESOURCE_RULES: dict[str, list[tuple[str, float]]] = {
    "경로당": [("F04", 0.9)],
    "노인여가복지시설": [("F04", 0.7)],
    "재가노인복지시설": [("F04", 0.6), ("F03", 0.4)],  # 방문 돌봄 중 장보기 대행 가능성
    "노인일자리지원기관": [("F04", 0.5)],
}


def tag_store(name: str, category: str) -> list[FunctionTag]:
    if "치즈" in name:
        return keep([
            FunctionTag(code=code, confidence=conf, evidence="이름에 '치즈' → 유제품 판매",
                        source="keyword")
            for code, conf in CHEESE_TAGS
        ])
    if category == "편의점" and "휴게소" in name:
        code, conf = REST_AREA_STORE
        return [FunctionTag(code=code, confidence=conf, source="keyword",
                            evidence="휴게소 안 편의점 → 주민 접근성 확인 필요")]
    tags = [
        FunctionTag(code=code, confidence=conf, evidence=f"업종 '{category}'", source="keyword")
        for code, conf in CATEGORY_RULES.get(category, [])
    ]
    mart = next((word for word in MART_WORDS if word in name), None)
    if mart:
        tags += [
            FunctionTag(code=code, confidence=conf, evidence=f"이름에 '{mart}'", source="keyword")
            for code, conf in MART_TAGS
        ]
    not_grocery = next((word for word in NOT_GROCERY_WORDS if word in name), None)
    if not_grocery and not mart:
        tags = [
            tag.model_copy(update={
                "confidence": 0.3,
                "evidence": f"{tag.evidence}, 이름에 '{not_grocery}' → 생필품 구매처 아닐 가능성",
            })
            for tag in tags
        ]
    return keep(tags)


def tag_resource(category: str) -> list[FunctionTag]:
    return keep([
        FunctionTag(code=code, confidence=conf, evidence=f"자원 종류 '{category}'",
                    source="keyword")
        for code, conf in RESOURCE_RULES.get(category, [])
    ])


def add_f04_rule(stores: pd.DataFrame, functions: dict[str, list[FunctionTag]]) -> None:
    """법정리에 F01이 확정된 영업 가게가 1곳뿐이면 그 가게에 F04 후보(0.5)를 붙인다."""
    grocery = stores[
        (stores["status"] == "ACTIVE")
        & stores["entity_id"].map(
            lambda eid: any(t.code == "F01" and t.confidence >= 0.6 for t in functions[eid])
        )
        & stores["village_id"].fillna("").ne("")
    ]
    counts = grocery.groupby("village_id")["entity_id"].count()
    for row in grocery[grocery["village_id"].map(counts) == 1].itertuples():
        # CSV 빈칸은 NaN(참 값)이라 `or`로 거르지 못한다
        village = row.village_name if isinstance(row.village_name, str) else row.village_id
        functions[row.entity_id] = keep([
            *functions[row.entity_id],
            FunctionTag(
                code="F04",
                confidence=0.5,
                evidence=f"{village}에 영업 중인 식료품점이 1곳뿐",
                source="keyword",
            ),
        ])


def run(stores: pd.DataFrame, resources: pd.DataFrame) -> dict[str, list[FunctionTag]]:
    functions = {
        row.entity_id: tag_store(row.name, row.category) for row in stores.itertuples()
    }
    add_f04_rule(stores, functions)
    functions.update({
        row.entity_id: tag_resource(row.category) for row in resources.itertuples()
    })
    return functions
