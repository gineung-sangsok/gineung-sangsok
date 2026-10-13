import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
OUT_DIR = BASE_DIR / "data" / "raw"
OUT_FILE = OUT_DIR / "vworld_legal_ri_imsil.geojson"

def main():
    load_dotenv()
    vworld_key = os.getenv("VWORLD_API_KEY")
    if not vworld_key:
        sys.exit("오류: .env 파일에 VWORLD_API_KEY가 설정되어 있지 않습니다.")

    # VWorld WFS API (법정경계 - 리)
    url = "https://api.vworld.kr/req/wfs"
    params = {
        "key": vworld_key,
        "service": "WFS",
        "version": "1.1.0",
        "request": "GetFeature",
        "typename": "LT_C_ADEMDR_INFO",  # 법정리 경계 레이어
        "output": "application/json",
        "srsName": "EPSG:4326",
        # 임실군 코드
        "filter": (
            "<Filter><PropertyIsLike wildCard='*' singleChar='.' escapeChar='!'>"
            "<PropertyName>emd_cd</PropertyName>"
            "<Literal>35550*</Literal>"
            "</PropertyIsLike></Filter>"
        )
    }

    print("VWorld API 요청 중...")
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        sys.exit(f"VWorld 연결 오류: {e}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(response.text, encoding="utf-8")
    print(f"✅ VWorld 법정리 경계 저장 완료: {OUT_FILE}")

if __name__ == "__main__":
    main()
