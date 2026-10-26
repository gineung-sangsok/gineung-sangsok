"""정답 라벨로 키워드 베이스라인과 LLM 태깅을 평가한다.

실행: uv run python scripts/evaluate_tagging.py [--labels data/labels/sample50.csv]
전제: scripts/run_tagging.py --method all --sample 50 을 먼저 실행해
      data/processed/tagging_{keyword,llm}_sample50.csv 가 있어야 한다.

정답 라벨은 기능별 0/1. 예측은 두 기준으로 본다.
  - 확정: confidence 0.6 이상만 "있음"
  - 확인 포함: confidence 0.4 이상(확인 필요 포함)을 "있음"
"""

import argparse
from pathlib import Path

import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score

BASE = Path(__file__).resolve().parents[1]
CODES = ["F01", "F02", "F03", "F04"]


def predictions(path: Path, entity_ids: pd.Series, threshold: float) -> pd.DataFrame:
    tags = pd.read_csv(path)
    tags = tags[tags["confidence"] >= threshold]
    grid = pd.DataFrame(0, index=entity_ids, columns=CODES)
    for row in tags.itertuples():
        if row.entity_id in grid.index:
            grid.loc[row.entity_id, row.code] = 1
    return grid


def scores(truth: pd.DataFrame, pred: pd.DataFrame) -> dict[str, float]:
    y, p = truth.values.ravel(), pred.values.ravel()
    return {
        "정밀도": precision_score(y, p, zero_division=0),
        "재현율": recall_score(y, p, zero_division=0),
        "F1": f1_score(y, p, zero_division=0),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", default=str(BASE / "data/labels/sample50.csv"))
    args = parser.parse_args()

    labels = pd.read_csv(args.labels)
    if labels[CODES].isna().any().any():
        raise SystemExit("라벨에 빈칸이 있습니다. F01~F04를 모두 0/1로 채워 주세요.")
    truth = labels.set_index("entity_id")[CODES].astype(int)
    n = len(labels)
    suffix = f"sample{n}"

    rows = []
    for method in ["keyword", "llm"]:
        path = BASE / f"data/processed/tagging_{method}_{suffix}.csv"
        for level, threshold in [("확정(0.6↑)", 0.6), ("확인 포함(0.4↑)", 0.4)]:
            pred = predictions(path, truth.index.to_series(), threshold)
            rows.append({"방법": method, "기준": level, "기능": "전체", **scores(truth, pred)})
            for code in CODES:
                rows.append({"방법": method, "기준": level, "기능": code,
                             **scores(truth[[code]], pred[[code]])})
    result = pd.DataFrame(rows)

    print(f"정답 라벨 {n}건 · 기능별 양성 수: {truth.sum().to_dict()}\n")
    overall = result[result["기능"] == "전체"].drop(columns="기능")
    print(overall.to_string(index=False, float_format=lambda v: f"{v:.2f}"))
    print("\n[기능별 F1 — 확정 기준]")
    by_code = result[(result["기준"] == "확정(0.6↑)") & (result["기능"] != "전체")]
    print(by_code.pivot(index="기능", columns="방법", values="F1")
          .to_string(float_format=lambda v: f"{v:.2f}"))

    out = BASE / f"data/processed/tagging_eval_{suffix}.csv"
    result.to_csv(out, index=False, encoding="utf-8-sig")
    print(f"\n저장: {out.relative_to(BASE)}")


if __name__ == "__main__":
    main()
