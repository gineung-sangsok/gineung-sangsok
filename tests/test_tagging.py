"""키워드 베이스라인 규칙과 LLM 태거(가짜 클라이언트)를 확인한다."""

from types import SimpleNamespace

import pandas as pd

from track1_tagging import keyword, llm
from track1_tagging.schema import FunctionTag, keep


def codes(tags):
    return {tag.code: tag.confidence for tag in tags}


def test_keep_drops_low_and_dedupes():
    tags = [
        FunctionTag(code="F01", confidence=0.6, evidence="a", source="keyword"),
        FunctionTag(code="F01", confidence=0.9, evidence="b", source="keyword"),
        FunctionTag(code="F02", confidence=0.3, evidence="c", source="keyword"),
    ]
    assert codes(keep(tags)) == {"F01": 0.9}


def test_store_rules():
    assert codes(keyword.tag_store("우리슈퍼", "슈퍼마켓")) == {"F01": 0.9, "F02": 0.5}
    assert codes(keyword.tag_store("씨유임실", "편의점")) == {"F01": 0.9}
    hanaro = codes(keyword.tag_store("임실농협하나로마트덕치점", "슈퍼마켓"))
    assert hanaro == {"F01": 0.9, "F02": 0.8, "F03": 0.7}
    # 업종이 슈퍼마켓이어도 휴게소는 생필품 구매처로 보지 않는다
    assert keyword.tag_store("이도령휴게소", "슈퍼마켓") == []


def test_resource_rules():
    assert codes(keyword.tag_resource("경로당")) == {"F04": 0.9}
    assert codes(keyword.tag_resource("재가노인복지시설")) == {"F04": 0.6, "F03": 0.4}


def test_f04_only_for_single_store_village():
    stores = pd.DataFrame({
        "entity_id": ["s1", "s2", "s3"],
        "name": ["우리슈퍼", "제일슈퍼", "태평슈퍼"],
        "category": ["슈퍼마켓"] * 3,
        "status": ["ACTIVE"] * 3,
        "village_id": ["A", "B", "B"],
        "village_name": ["가리", "나리", "나리"],
    })
    functions = {row.entity_id: keyword.tag_store(row.name, row.category)
                 for row in stores.itertuples()}
    keyword.add_f04_rule(stores, functions)
    assert codes(functions["s1"])["F04"] == 0.5
    assert "F04" not in codes(functions["s2"])


class FakeResponses:
    def __init__(self):
        self.calls = 0

    def parse(self, **kwargs):
        self.calls += 1
        parsed = llm.LLMOutput(functions=[
            llm.LLMTag(code="F01", confidence=0.95, evidence="슈퍼마켓"),
            llm.LLMTag(code="F02", confidence=0.2, evidence="불확실"),
        ])
        usage = SimpleNamespace(input_tokens=100, output_tokens=20)
        return SimpleNamespace(output_parsed=parsed, usage=usage)


def test_llm_tagger_caches_and_filters(tmp_path, monkeypatch):
    monkeypatch.setattr(llm, "CACHE_DIR", tmp_path)
    fake = FakeResponses()
    tagger = llm.Tagger("test-model", client=SimpleNamespace(responses=fake))
    entity = {"이름": "우리슈퍼", "업종_또는_종류": "슈퍼마켓"}

    first = tagger.tag_entity(entity)
    second = tagger.tag_entity(entity)
    assert codes(first) == {"F01": 0.95}  # 0.4 미만은 버림
    assert first[0].source == "llm"
    assert first == second and fake.calls == 1

    tagger.save()
    reloaded = llm.Tagger("test-model", client=SimpleNamespace(responses=fake))
    reloaded.tag_entity(entity)
    assert fake.calls == 1  # 파일 캐시에서 읽음


def test_f04_evidence_uses_village_id_when_name_missing():
    stores = pd.DataFrame({
        "entity_id": ["s1"], "name": ["우리슈퍼"], "category": ["슈퍼마켓"],
        "status": ["ACTIVE"], "village_id": ["5275040026"], "village_name": [float("nan")],
    })
    functions = {"s1": keyword.tag_store("우리슈퍼", "슈퍼마켓")}
    keyword.add_f04_rule(stores, functions)
    f04 = next(tag for tag in functions["s1"] if tag.code == "F04")
    assert f04.evidence.startswith("5275040026")


def test_llm_cache_key_changes_with_prompt_text(tmp_path, monkeypatch):
    monkeypatch.setattr(llm, "CACHE_DIR", tmp_path)
    fake = FakeResponses()
    tagger = llm.Tagger("test-model", client=SimpleNamespace(responses=fake))
    entity = {"이름": "우리슈퍼"}
    before = tagger._key(entity)
    tagger.prompt += "\n- 규칙 하나 추가"
    assert tagger._key(entity) != before
