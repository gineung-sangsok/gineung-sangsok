"""태깅 결과 형식. docs/contracts/tagging_schema.json(v1.0)의 functions[]를 따른다."""

from typing import Literal

from pydantic import BaseModel, Field

FunctionCode = Literal["F01", "F02", "F03", "F04"]  # F05는 MVP 제외

# confidence 기준 (function_taxonomy.md v1.0)
CONFIRM = 0.6  # 이상: 태그 확정
REVIEW = 0.4  # 이상 CONFIRM 미만: 확인 필요 / 미만: 버림


class FunctionTag(BaseModel):
    code: FunctionCode
    confidence: float = Field(ge=0, le=1)
    evidence: str
    source: Literal["llm", "keyword", "manual"]


def keep(tags: list[FunctionTag]) -> list[FunctionTag]:
    """confidence 0.4 미만은 버리고, 코드별로 가장 높은 것 하나만 남긴다."""
    best: dict[str, FunctionTag] = {}
    for tag in tags:
        if tag.confidence < REVIEW:
            continue
        if tag.code not in best or tag.confidence > best[tag.code].confidence:
            best[tag.code] = tag
    return sorted(best.values(), key=lambda tag: tag.code)


def label(confidence: float) -> str:
    return "확정" if confidence >= CONFIRM else "확인 필요"
