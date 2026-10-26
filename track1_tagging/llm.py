"""LLM 기능 분리·자원 태깅.

모든 LLM 호출은 tag_entity() 하나를 거친다 (모델 교체·비교를 한 곳에서 하기 위해).
결과는 (프롬프트 버전, 모델, 입력) 해시로 캐시해 같은 입력은 다시 부르지 않는다.
"""

import hashlib
import json
import threading
from pathlib import Path

from openai import OpenAI
from pydantic import BaseModel, Field

from track1_tagging.schema import FunctionCode, FunctionTag, keep

PROMPT_DIR = Path(__file__).parent / "prompts"
CACHE_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "llm_cache"


class LLMTag(BaseModel):
    code: FunctionCode
    confidence: float = Field(ge=0, le=1)
    evidence: str


class LLMOutput(BaseModel):
    functions: list[LLMTag]


class Tagger:
    def __init__(self, model: str, prompt_version: str = "v1", client: OpenAI | None = None):
        self.model = model
        self.prompt_version = prompt_version
        self.prompt = (PROMPT_DIR / f"{prompt_version}.md").read_text(encoding="utf-8")
        self.client = client or OpenAI()
        self.cache_file = CACHE_DIR / f"{model}.json"
        self.cache: dict[str, dict] = (
            json.loads(self.cache_file.read_text(encoding="utf-8"))
            if self.cache_file.exists() else {}
        )
        self.lock = threading.Lock()
        self.calls = 0
        self.input_tokens = 0
        self.output_tokens = 0

    def _key(self, entity: dict) -> str:
        # 같은 파일명의 프롬프트를 고쳐도 이전 결과를 재사용하지 않도록 본문까지 넣는다
        raw = json.dumps([self.prompt_version, self.prompt, self.model, entity],
                         ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def tag_entity(self, entity: dict) -> list[FunctionTag]:
        """entity: 이름·업종·주소 등 태깅에 쓸 필드만 담은 dict."""
        key = self._key(entity)
        with self.lock:
            cached = self.cache.get(key)
        if cached is None:
            response = self.client.responses.parse(
                model=self.model,
                instructions=self.prompt,
                input=json.dumps(entity, ensure_ascii=False),
                text_format=LLMOutput,
            )
            cached = response.output_parsed.model_dump()
            with self.lock:
                self.cache[key] = cached
                self.calls += 1
                if response.usage:
                    self.input_tokens += response.usage.input_tokens
                    self.output_tokens += response.usage.output_tokens
        output = LLMOutput.model_validate(cached)
        return keep([FunctionTag(**tag.model_dump(), source="llm") for tag in output.functions])

    def save(self) -> None:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with self.lock:
            self.cache_file.write_text(json.dumps(self.cache, ensure_ascii=False), "utf-8")
