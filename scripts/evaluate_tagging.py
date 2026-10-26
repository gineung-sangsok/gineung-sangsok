"""정답 라벨로 키워드 베이스라인과 LLM 태깅을 평가한다.

실행: uv run python scripts/evaluate_tagging.py [--labels data/labels/sample50.csv]
전제: scripts/run_tagging.py --method all --sample 50 을 먼저 실행해
      data/processed/tagging_{keyword,llm,compare}_sample50.csv 가 있어야 한다.
예측 파일은 라벨 파일 이름(sample50)으로 찾고, 평가 전에 두 파일의 엔티티가 같은지 확인한다.

라벨러가 둘이면 먼저 일치도를 본다:
  uv run python scripts/evaluate_tagging.py \
      --agreement data/labels/eval50_A.csv data/labels/eval50_B.csv
  → 기능별 코헨 카파, 의견이 갈린 항목 목록(<name>_disagree.csv),
    둘이 같은 칸만 채운 정답 초안(<name>.csv, 갈린 칸은 빈칸 → 합의 후 채움)

정답 라벨은 기능별 0/1. 예측은 두 기준으로 본다.
  - 확정: confidence 0.6 이상만 "있음"
  - 확인 포함: confidence 0.4 이상(확인 필요 포함)을 "있음"
"""

import argparse
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score, f1_score, precision_score, recall_score

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


def read_labels(path: str) -> pd.DataFrame:
    labels = pd.read_csv(path)
    if labels[CODES].isna().any().any():
        raise SystemExit(f"{path}에 빈칸이 있습니다. F01~F04를 모두 0/1로 채워 주세요.")
    return labels


def agreement(path_a: str, path_b: str) -> None:
    a, b = read_labels(path_a), read_labels(path_b)
    if set(a["entity_id"]) != set(b["entity_id"]):
        raise SystemExit("두 라벨 파일의 표본이 다릅니다.")
    a = a.set_index("entity_id")
    b = b.set_index("entity_id").loc[a.index]

    print(f"라벨러 간 일치도 ({len(a)}건)")
    for code in CODES:
        kappa = cohen_kappa_score(a[code].astype(int), b[code].astype(int))
        same = (a[code].astype(int) == b[code].astype(int)).mean()
        print(f"  {code}: 카파 {kappa:.2f} · 일치 {same:.0%}")
    flat_a, flat_b = a[CODES].astype(int).values.ravel(), b[CODES].astype(int).values.ravel()
    print(f"  전체: 카파 {cohen_kappa_score(flat_a, flat_b):.2f}")

    name = Path(path_a).stem.rsplit("_", 1)[0]  # eval50_A → eval50
    labels_dir = Path(path_a).parent
    info = ["entity_type", "name", "category", "village_name", "address"]
    diff = [
        {"entity_id": eid, **a.loc[eid, info].to_dict(), "code": code,
         "A": int(a.loc[eid, code]), "B": int(b.loc[eid, code]), "final": ""}
        for eid in a.index for code in CODES
        if int(a.loc[eid, code]) != int(b.loc[eid, code])
    ]
    pd.DataFrame(diff).to_csv(labels_dir / f"{name}_disagree.csv", index=False,
                              encoding="utf-8-sig")
    print(f"\n의견이 갈린 칸 {len(diff)}개 → {name}_disagree.csv (final 칸에 합의값 기록)")

    gold = labels_dir / f"{name}.csv"
    if gold.exists():
        print(f"{gold.name}이 이미 있어 정답 초안은 만들지 않았습니다.")
        return
    draft = a.copy()
    for code in CODES:
        draft[code] = a[code].astype(int).where(a[code].astype(int) == b[code].astype(int))
    draft.reset_index().to_csv(gold, index=False, encoding="utf-8-sig", float_format="%.0f")
    print(f"정답 초안 {gold.name} (갈린 칸은 빈칸, 합의 후 채우면 평가 가능)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", default=str(BASE / "data/labels/sample50.csv"))
    parser.add_argument("--agreement", nargs=2, metavar=("A", "B"),
                        help="라벨러 두 명의 라벨 파일 → 일치도와 정답 초안")
    args = parser.parse_args()
    if args.agreement:
        agreement(*args.agreement)
        return

    labels = read_labels(args.labels)
    truth = labels.set_index("entity_id")[CODES].astype(int)
    n = len(labels)
    suffix = Path(args.labels).stem  # sample50.csv → sample50

    # 라벨과 예측이 같은 표본인지 확인한다 (compare 파일에는 태그 없는 엔티티도 들어 있다)
    compare = BASE / f"data/processed/tagging_compare_{suffix}.csv"
    if not compare.exists():
        raise SystemExit(f"{compare.relative_to(BASE)} 없음. run_tagging.py를 먼저 실행하세요.")
    predicted_ids = set(pd.read_csv(compare)["entity_id"])
    if predicted_ids != set(truth.index):
        missing = len(set(truth.index) - predicted_ids)
        extra = len(predicted_ids - set(truth.index))
        raise SystemExit(f"라벨과 예측의 표본이 다릅니다 (라벨에만 {missing}건, "
                         f"예측에만 {extra}건).")

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
