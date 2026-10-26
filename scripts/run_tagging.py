"""가게·자원 전체에 기능 태깅을 실행하고 키워드 베이스라인과 LLM 결과를 비교한다.

실행:
  uv run python scripts/run_tagging.py --method keyword          # 키워드만 (API 키 불필요)
  uv run python scripts/run_tagging.py --method all              # 키워드 + LLM
  uv run python scripts/run_tagging.py --method all --sample 50  # 샘플 50건만 (프롬프트 실험용)
필요: LLM은 .env의 OPENAI_API_KEY, OPENAI_MODEL

출력 (data/processed/)
  - tagging_keyword.csv, tagging_llm.csv : entity_id별 기능 태그 (한 행 = 태그 하나)
  - tagging_compare.csv                  : 엔티티·기능별 두 방법 비교
  --sample이면 파일명에 _sample<n>이 붙고, data/labels/sample<n>.csv(정답 라벨용 빈 표)를 만든다.
"""

import argparse
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from track1_tagging import keyword  # noqa: E402
from track1_tagging.schema import CONFIRM, FunctionTag  # noqa: E402

PROCESSED = Path(__file__).resolve().parents[1] / "data" / "processed"
LABELS = Path(__file__).resolve().parents[1] / "data" / "labels"
CODES = ["F01", "F02", "F03", "F04"]


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    stores = pd.read_csv(PROCESSED / "stores_imsil.csv", dtype=str)
    resources = pd.read_csv(PROCESSED / "resources_imsil.csv", dtype=str)
    # 폐업 이력(CLOSED) 가게는 태깅 대상이 아니다
    return stores[stores["status"] != "CLOSED"], resources


def sample(stores: pd.DataFrame, resources: pd.DataFrame, n: int, seed: int = 42):
    """가게:자원 = 3:2, 업종·자원 종류별로 고르게 뽑는다."""
    def spread(df: pd.DataFrame, k: int) -> pd.DataFrame:
        per = max(1, k // df["category"].nunique())
        picked = pd.concat(
            g.sample(min(len(g), per), random_state=seed) for _, g in df.groupby("category")
        )
        rest = df.drop(picked.index)
        extra = rest.sample(max(0, k - len(picked)), random_state=seed)
        return pd.concat([picked, extra]).head(k)

    n_store = round(n * 0.6)
    return spread(stores, n_store), spread(resources, n - n_store)


def village_store_counts(stores: pd.DataFrame, functions: dict) -> dict[str, int]:
    grocery = stores[stores["entity_id"].map(
        lambda eid: any(t.code == "F01" and t.confidence >= CONFIRM for t in functions[eid])
    )]
    return grocery.groupby("village_id")["entity_id"].count().to_dict()


def llm_input(row, kind: str, counts: dict[str, int]) -> dict:
    entity = {
        "구분": "가게" if kind == "store" else "자원",
        "이름": row.name,
        "업종_또는_종류": row.category,
        "주소": row.address,
        "법정리": row.village_name if isinstance(row.village_name, str) else "",
    }
    if kind == "store":
        entity["같은_법정리_영업_식료품점_수"] = counts.get(row.village_id, 0)
    return entity


def to_frame(functions: dict[str, list[FunctionTag]]) -> pd.DataFrame:
    rows = [
        {"entity_id": eid, **tag.model_dump()}
        for eid, tags in functions.items() for tag in tags
    ]
    return pd.DataFrame(rows, columns=["entity_id", "code", "confidence", "evidence", "source"])


def compare(entities: pd.DataFrame, kw: pd.DataFrame, llm: pd.DataFrame) -> pd.DataFrame:
    grid = entities[["entity_id", "entity_type", "name", "category"]].merge(
        pd.DataFrame({"code": CODES}), how="cross"
    )
    for name, df in [("keyword", kw), ("llm", llm)]:
        grid = grid.merge(
            df[["entity_id", "code", "confidence"]].rename(columns={"confidence": name}),
            on=["entity_id", "code"], how="left",
        )
    grid[["keyword", "llm"]] = grid[["keyword", "llm"]].fillna(0.0)
    grid["kw_yes"] = grid["keyword"] >= CONFIRM
    grid["llm_yes"] = grid["llm"] >= CONFIRM
    return grid


def report(grid: pd.DataFrame) -> None:
    print("\n[확정 태그(0.6↑) 일치율 — 기능별]")
    for code, g in grid.groupby("code"):
        agree = (g["kw_yes"] == g["llm_yes"]).mean()
        kw_only = (g.kw_yes & ~g.llm_yes).sum()
        llm_only = (~g.kw_yes & g.llm_yes).sum()
        both = (g.kw_yes & g.llm_yes).sum()
        print(f"  {code}: 일치 {agree:.1%} | 키워드만 {kw_only:3d} | LLM만 {llm_only:3d} "
              f"| 둘 다 {both:3d}")
    diff = grid[grid["kw_yes"] != grid["llm_yes"]]
    print(f"\n[불일치 {len(diff)}건 중 일부]")
    print(diff[["name", "category", "code", "keyword", "llm"]].head(25).to_string(index=False))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--method", choices=["keyword", "all"], default="keyword")
    parser.add_argument("--sample", type=int, help="샘플 n건만 실행 (가게 60%%, 자원 40%%)")
    parser.add_argument("--prompt", default="v1", help="track1_tagging/prompts/<버전>.md")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    stores, resources = load()
    # F04 규칙·법정리 가게 수는 전체 가게 기준이어야 하므로 샘플링 전에 계산한다
    kw = keyword.run(stores, resources)
    counts = village_store_counts(stores, kw)
    if args.sample:
        stores, resources = sample(stores, resources, args.sample)
        kw = {eid: kw[eid] for eid in pd.concat([stores, resources])["entity_id"]}
        # 사람이 정답 기능을 적을 수 있게 샘플 목록을 남긴다 (F01~F04 칸은 비워 둠)
        # 이미 있으면 라벨을 덮어쓰지 않는다
        label_file = LABELS / f"sample{args.sample}.csv"
        if not label_file.exists():
            LABELS.mkdir(parents=True, exist_ok=True)
            cols = ["entity_id", "entity_type", "name", "category", "village_name", "address"]
            pd.concat([stores, resources])[cols].assign(**{c: "" for c in CODES}).to_csv(
                label_file, index=False, encoding="utf-8-sig"
            )
    suffix = f"_sample{args.sample}" if args.sample else ""

    kw_df = to_frame(kw)
    kw_df.to_csv(PROCESSED / f"tagging_keyword{suffix}.csv", index=False, encoding="utf-8-sig")
    print(f"키워드: 가게 {len(stores)} · 자원 {len(resources)} → 태그 {len(kw_df)}개")
    print(kw_df.assign(level=kw_df["confidence"].ge(CONFIRM).map({True: "확정", False: "확인"}))
          .pivot_table(index="code", columns="level", values="entity_id", aggfunc="count")
          .fillna(0).astype(int).to_string())
    if args.method == "keyword":
        return

    load_dotenv()
    model = os.getenv("OPENAI_MODEL")
    if not os.getenv("OPENAI_API_KEY") or not model:
        sys.exit(".env에 OPENAI_API_KEY와 OPENAI_MODEL이 필요합니다.")
    from track1_tagging.llm import Tagger

    tagger = Tagger(model, args.prompt)
    jobs = [(r.entity_id, llm_input(r, "store", counts)) for r in stores.itertuples()]
    jobs += [(r.entity_id, llm_input(r, "resource", counts)) for r in resources.itertuples()]
    started = time.time()
    try:
        with ThreadPoolExecutor(args.workers) as pool:
            results = list(pool.map(lambda job: (job[0], tagger.tag_entity(job[1])), jobs))
    finally:
        tagger.save()
    llm_df = to_frame(dict(results))
    llm_df.to_csv(PROCESSED / f"tagging_llm{suffix}.csv", index=False, encoding="utf-8-sig")
    print(f"\nLLM({model}, 프롬프트 {args.prompt}): 새 호출 {tagger.calls}회, "
          f"입력 {tagger.input_tokens:,} / 출력 {tagger.output_tokens:,} 토큰, "
          f"{time.time() - started:.0f}초")

    entities = pd.concat([stores, resources])
    grid = compare(entities, kw_df, llm_df)
    grid.to_csv(PROCESSED / f"tagging_compare{suffix}.csv", index=False, encoding="utf-8-sig")
    report(grid)


if __name__ == "__main__":
    main()
