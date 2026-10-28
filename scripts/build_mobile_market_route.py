"""이동장터 노선을 법정리 단위로 정리한다 (#10).

공개된 마을 명단은 2026-02 시범 운영뿐이다:
  임실읍 41개 마을, 이도리·성가리·두곡리 제외 (브릿지경제 2026-02-05).
9월 정식 운영(38개 법정리·70개 행정리)은 마을 명단이 공개되지 않아 넣지 않는다.

출력: data/processed/mobile_market_route_ri.csv
  status = pilot   : 시범 노선에 포함된 법정리
           excluded: 시범 노선에서 명시적으로 뺀 법정리
"""

from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parents[1]
PROCESSED = BASE / "data" / "processed"

PILOT_EUP = "임실읍"
PILOT_EXCLUDED = {"이도리", "성가리", "두곡리"}
SOURCE = ("브릿지경제", "https://www.viva100.com/article/20260205500528", "2026-02-05")


def build(villages: pd.DataFrame) -> pd.DataFrame:
    rows = villages[villages["eup_myeon"] == PILOT_EUP]
    return pd.DataFrame({
        "ri_code": rows["ri_code"],
        "ri_name": rows["ri_name"],
        "eup_myeon": rows["eup_myeon"],
        "status": ["excluded" if n in PILOT_EXCLUDED else "pilot" for n in rows["ri_name"]],
        "visit_frequency": "주 1회",
        "period": "2026-02 시범",
        "source": SOURCE[0],
        "source_url": SOURCE[1],
        "source_date": SOURCE[2],
    })


def main() -> None:
    villages = pd.read_csv(PROCESSED / "villages_ri.csv", dtype={"ri_code": str})
    route = build(villages)
    out = PROCESSED / "mobile_market_route_ri.csv"
    route.to_csv(out, index=False, encoding="utf-8-sig")
    pilot, excluded = (route.status == "pilot").sum(), (route.status == "excluded").sum()
    print(f"{out.relative_to(BASE)}: 시범 {pilot} · 제외 {excluded}")


if __name__ == "__main__":
    main()
