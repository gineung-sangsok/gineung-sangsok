# scripts/generate_mobile_market.py
import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_JSON = BASE_DIR / "data" / "raw" / "sgis_population_imsil_2020.json"
OUT_CSV = BASE_DIR / "data" / "processed" / "mobile_market_imsil.csv"

def main():
    if not RAW_JSON.exists():
        print(f"오류: {RAW_JSON} 파일이 없습니다.")
        return

    with open(RAW_JSON, encoding="utf-8") as f:
        data = json.load(f)

    # SGIS 읍면 목록 추출
    total_pop = data.get("total_population", [])

    # 읍면별 명칭 추출
    eup_myeons = [row.get("adm_nm", "") for row in total_pop]

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    headers = [
        "admin_ri_code",
        "eup_myeon",
        "admin_ri_name",
        "mobile_market_active",
        "visit_day",
        "visit_frequency",
        "source_url",
        "source_date"
    ]

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        # 읍면 기본 데이터 세팅 (행정리 세부 데이터 매핑 준비)
        for em in eup_myeons:
            writer.writerow([
                "",                          # admin_ri_code (추후 MDIS 매핑)
                em,                          # eup_myeon (예: 임실군 관촌면)
                "예시리",                     # admin_ri_name
                "true",                      # mobile_market_active
                "미정",                      # visit_day
                "주 1회",                    # visit_frequency
                "https://www.yna.co.kr/view/AKR20260902161500055", # source_url
                "2026-09-02"                 # source_date
            ])

    print(f"✅ 이동장터 기본 CSV 생성 완료: {OUT_CSV}")

if __name__ == "__main__":
    main()
