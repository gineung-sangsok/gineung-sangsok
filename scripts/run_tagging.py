"""가게·자원 전체에 기능 태깅을 실행하고 키워드 베이스라인과 LLM 결과를 비교한다.

실행:
  uv run python scripts/run_tagging.py --method keyword          # 키워드만 (API 키 불필요)
  uv run python scripts/run_tagging.py --method all              # 키워드 + LLM
  uv run python scripts/run_tagging.py --method all --sample 50  # 샘플 50건만 (프롬프트 실험용)
필요: LLM은 .env의 OPENAI_API_KEY, OPENAI_MODEL

출력 (data/processed/)
  - tagging_keyword.csv, tagging_llm.csv : entity_id별 기능 태그 (한 행 = 태그 하나)
  - tagging_compare.csv                  : 엔티티·기능별 두 방법 비교
  --sample이면 파일명에 _<name>(기본 sample<n>)이 붙고, data/labels/에 정답 라벨용 빈 표를 만든다.
  평가용 새 표본 예:
  uv run python scripts/run_tagging.py --method all --prompt v4 --sample 50 --name eval50 \
      --seed 7 --store-ratio 0.8 --exclude data/labels/sample50.csv --labelers A B
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


def sample(stores: pd.DataFrame, resources: pd.DataFrame, n: int, seed: int = 42,
           store_ratio: float = 0.6, exclude: frozenset[str] = frozenset()):
    """업종·자원 종류별로 고르게 뽑는다. exclude에 든 엔티티(이전 표본)는 뽑지 않는다."""
    stores = stores[~stores["entity_id"].isin(exclude)]
    resources = resources[~resources["entity_id"].isin(exclude)]

    def spread(df: pd.DataFrame, k: int) -> pd.DataFrame:
        per = max(1, k // df["category"].nunique())
        picked = pd.concat(
            g.sample(min(len(g), per), random_state=seed) for _, g in df.groupby("category")
        )
        rest = df.drop(picked.index)
        extra = rest.sample(max(0, k - len(picked)), random_state=seed)
        return pd.concat([picked, extra]).head(k)

    n_store = round(n * store_ratio)
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
    parser.add_argument("--sample", type=int, help="샘플 n건만 실행")
    parser.add_argument("--name", help="표본 이름 (기본 sample<n>). 파일명에 쓰인다")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--store-ratio", type=float, default=0.6, help="표본 중 가게 비율")
    parser.add_argument("--exclude", nargs="*", default=[],
                        help="이 라벨 파일의 엔티티는 표본에서 뺀다")
    parser.add_argument("--labelers", nargs="*", default=[],
                        help="라벨러별 빈 라벨 표를 만든다 (예: A B → <name>_A.csv, <name>_B.csv)")
    parser.add_argument("--prompt", default="v1", help="track1_tagging/prompts/<버전>.md")
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    stores, resources = load()
    # F04 규칙·법정리 가게 수는 전체 가게 기준이어야 하므로 샘플링 전에 계산한다
    kw = keyword.run(stores, resources)
    counts = village_store_counts(stores, kw)
    name = args.name or (f"sample{args.sample}" if args.sample else "")
    if args.sample:
        exclude = frozenset().union(*(set(pd.read_csv(p)["entity_id"]) for p in args.exclude))
        stores, resources = sample(stores, resources, args.sample, args.seed,
                                   args.store_ratio, exclude)
        kw = {eid: kw[eid] for eid in pd.concat([stores, resources])["entity_id"]}
        # 사람이 정답 기능을 적을 수 있게 빈 라벨 표를 남긴다. 이미 있으면 덮어쓰지 않는다
        cols = ["entity_id", "entity_type", "name", "category", "village_name", "address"]
        sheet = pd.concat([stores, resources])[cols].assign(**{c: "" for c in CODES})
        LABELS.mkdir(parents=True, exist_ok=True)
        for label_file in [LABELS / f"{name}_{who}.csv" for who in args.labelers] or [
            LABELS / f"{name}.csv"
        ]:
            if not label_file.exists():
                sheet.to_csv(label_file, index=False, encoding="utf-8-sig")
                print(f"빈 라벨 표: {label_file.relative_to(LABELS.parents[1])}")
    suffix = f"_{name}" if name else ""

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
