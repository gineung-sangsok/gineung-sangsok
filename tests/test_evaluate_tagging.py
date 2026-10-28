"""라벨 검증과 라벨러 간 일치도 계산(합의값 보존)을 확인한다."""

import pandas as pd
import pytest

from scripts import evaluate_tagging as ev

HEADER = "entity_id,entity_type,name,category,village_name,address,F01,F02,F03,F04\n"


def write(path, rows):
    path.write_text(HEADER + "".join(rows), encoding="utf-8")
    return str(path)


def test_read_labels_rejects_values_other_than_0_1(tmp_path):
    path = write(tmp_path / "x_A.csv", ["s1,store,가게,슈퍼,리,주소,1,0.5,0,2\n"])
    with pytest.raises(SystemExit, match="0/1이 아닌 값"):
        ev.read_labels(path)


def test_agreement_keeps_final_values_on_rerun(tmp_path):
    a = write(tmp_path / "eval_A.csv", ["s1,store,가게,슈퍼,리,주소,1,1,0,0\n",
                                        "s2,store,가게2,슈퍼,리,주소,1,0,0,1\n"])
    b = write(tmp_path / "eval_B.csv", ["s1,store,가게,슈퍼,리,주소,1,0,0,0\n",
                                        "s2,store,가게2,슈퍼,리,주소,0,0,0,1\n"])
    ev.agreement(a, b)
    disagree = tmp_path / "eval_disagree.csv"
    # 담당자가 표 프로그램에서 합의값을 적어 넣은 상황
    df = pd.read_csv(disagree, dtype={"final": str})
    df.loc[(df["entity_id"] == "s1") & (df["code"] == "F02"), "final"] = "1"
    df.to_csv(disagree, index=False, encoding="utf-8-sig")

    ev.agreement(a, b)
    again = pd.read_csv(disagree, dtype={"final": str}).set_index(["entity_id", "code"])["final"]
    assert again[("s1", "F02")] == "1"
    assert pd.isna(again[("s2", "F01")])
