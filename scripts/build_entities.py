"""수집한 원본을 정제·지오코딩해 가게·자원 목록을 data/processed/에 저장한다.

실행: uv run python scripts/build_entities.py
필요: .env의 VWORLD_API_KEY, data/raw/의 원본 4종
  - sbiz_stores_imsil_*.csv              (scripts/fetch_sbiz_stores.py)
  - 식품_식품판매업(기타)_전북임실군.csv    (LOCALDATA, EPSG:5174)
  - senior_centers_imsil_*.csv           (scripts/fetch_senior_centers.py)
  - 전북특별자치도 임실군_노인복지시설현황_*.csv

출력 (좌표는 모두 EPSG:4326, village_id는 법정리코드 10자리)
  - data/processed/stores_imsil.csv
  - data/processed/resources_imsil.csv
지오코딩 결과는 data/raw/vworld_geocode_cache.json에 캐시해 재실행 시 API를 다시 부르지 않는다.
"""

import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from fnmatch import fnmatch
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from pyproj import Transformer

BASE_DIR = Path(__file__).resolve().parents[1]
RAW = BASE_DIR / "data" / "raw"
PROCESSED = BASE_DIR / "data" / "processed"
CACHE_FILE = RAW / "vworld_geocode_cache.json"
VWORLD_URL = "https://api.vworld.kr/req/address"

SIGNGU_CODE = "52750"  # 임실군 법정동코드 앞 5자리
# 임실군 경계를 넉넉히 감싸는 범위. 이 밖의 좌표는 지오코딩 오류로 본다.
LAT_RANGE = (35.40, 35.80)
LNG_RANGE = (127.00, 127.50)

# 상가정보 중분류 중 식료품점으로 보는 것. 건강보조식품은 생필품·신선식품 기능과 멀어 제외
FOOD_MIDDLE = {"종합 소매", "식료품 소매"}
FOOD_EXCLUDE = {"건강보조식품 소매업"}

# 노인복지시설 종류 → 자원 유형. 노인의료복지시설(요양원)은 입소 시설이라 제외
WELFARE_TYPES = {
    "재가노인복지시설": "R04",
    "노인여가복지시설": "R04",
    "노인일자리지원기관": "R04",
}

COLUMNS = [
    "entity_id",
    "entity_type",
    "resource_type",
    "name",
    "category",
    "status",
    "closure_date",
    "village_id",
    "village_name",
    "lat",
    "lng",
    "address",
    "source",
    "source_id",
    "note",
]


def latest(pattern: str) -> Path:
    # macOS는 한글 파일명을 NFD로 저장하므로 NFC로 맞춰 비교한다
    files = sorted(
        path for path in RAW.iterdir()
        if fnmatch(unicodedata.normalize("NFC", path.name), pattern)
    )
    if not files:
        sys.exit(f"data/raw/에 {pattern} 파일이 없습니다.")
    return files[-1]


def ri_name(address: str) -> str:
    """지번주소에서 법정리 이름(○○리)을 뽑는다. 읍 소재지 등 리가 없으면 빈 문자열."""
    for token in address.split():
        if re.fullmatch(r"\S+리", token):
            return token
    return ""


def clean_address(address: str) -> str:
    """'운수로 51, 4층'처럼 쉼표 뒤 상세주소를 떼고 옛 도명을 바꾼다."""
    address = address.split(",")[0].strip()
    address = re.sub(r"\s+", " ", address)
    return address.replace("전라북도", "전북특별자치도")


class VWorld:
    def __init__(self, key: str):
        self.key = key
        self.cache: dict[str, dict | None] = (
            json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else {}
        )
        self.calls = 0

    def _get(self, params: dict) -> dict:
        params = {"service": "address", "version": "2.0", "format": "json",
                  "crs": "epsg:4326", "key": self.key, **params}
        url = f"{VWORLD_URL}?{urllib.parse.urlencode(params)}"
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        self.calls += 1
        time.sleep(0.05)
        response = data.get("response", {})
        if response.get("status") == "ERROR":
            sys.exit(f"VWorld 오류: {response.get('error')}")
        return response

    def geocode(self, address: str) -> tuple[float, float] | None:
        """주소 → (lat, lng). 도로명으로 먼저 찾고 실패하면 지번으로 찾는다."""
        key = f"geo:{address}"
        if key not in self.cache:
            self.cache[key] = None
            for kind in ("road", "parcel"):
                res = self._get({"request": "getcoord", "type": kind, "address": address})
                if res.get("status") == "OK":
                    point = res["result"]["point"]
                    self.cache[key] = {"lat": float(point["y"]), "lng": float(point["x"])}
                    break
        hit = self.cache[key]
        return (hit["lat"], hit["lng"]) if hit else None

    def village(self, lat: float, lng: float) -> tuple[str, str]:
        """좌표 → (법정리코드 10자리, 리 이름)."""
        key = f"rev:{lat:.6f},{lng:.6f}"
        if key not in self.cache:
            self.cache[key] = None
            res = self._get({"request": "getAddress", "type": "parcel", "point": f"{lng},{lat}"})
            if res.get("status") == "OK" and res.get("result"):
                first = res["result"][0]
                self.cache[key] = {
                    "code": first["structure"]["level4LC"],
                    "name": ri_name(first["text"]),
                }
        hit = self.cache[key]
        return (hit["code"], hit["name"]) if hit else ("", "")

    def save(self) -> None:
        CACHE_FILE.write_text(json.dumps(self.cache, ensure_ascii=False, indent=1), "utf-8")


def load_sbiz() -> pd.DataFrame:
    df = pd.read_csv(latest("sbiz_stores_imsil_*.csv"), dtype=str)
    food = df[df["indsMclsNm"].isin(FOOD_MIDDLE) & ~df["indsSclsNm"].isin(FOOD_EXCLUDE)]
    return pd.DataFrame({
        "entity_type": "store",
        "name": food["bizesNm"].str.strip(),
        "category": food["indsSclsNm"],
        "status": "ACTIVE",
        "village_id": food["ldongCd"],
        "village_name": food["lnoAdr"].fillna("").map(ri_name),
        "lat": food["lat"].astype(float),
        "lng": food["lon"].astype(float),
        "address": food["rdnmAdr"].fillna(food["lnoAdr"]),
        "source": "sbiz",
        "source_id": food["bizesId"],
    })


def load_localdata(vworld: VWorld, failed: list[str]) -> pd.DataFrame:
    df = pd.read_csv(latest("식품_식품판매업(기타)_*.csv"), encoding="cp949", dtype=str)
    to_wgs84 = Transformer.from_crs("EPSG:5174", "EPSG:4326", always_xy=True)
    x = pd.to_numeric(df["좌표정보(X)"], errors="coerce")
    y = pd.to_numeric(df["좌표정보(Y)"], errors="coerce")
    lng, lat = to_wgs84.transform(x.values, y.values)
    # 좌표가 비어 있는 행은 NaN으로 두고 locate()에서 주소로 지오코딩한다
    has_xy = (x.notna() & y.notna()).values
    lat = pd.Series(lat).where(has_xy)
    lng = pd.Series(lng).where(has_xy)
    out = pd.DataFrame({
        "entity_type": "store",
        "name": df["사업장명"].str.strip(),
        "category": "식품판매업(기타)",
        "status": df["영업상태명"].map(lambda s: "CLOSED" if s == "폐업" else "ACTIVE"),
        "closure_date": df["폐업일자"].fillna(""),
        "lat": lat,
        "lng": lng,
        "address": df["도로명주소"].fillna(df["지번주소"]),
        "source": "localdata",
        "source_id": df["관리번호"],
    })
    return locate(vworld, out, failed)


def locate(vworld: VWorld, df: pd.DataFrame, failed: list[str]) -> pd.DataFrame:
    """좌표가 없는 행은 주소로 지오코딩하고, 좌표가 있는 모든 행에 법정리를 붙인다.

    주소가 없거나 지오코딩에 실패한 행은 좌표를 비워 두고 failed에 기록한다.
    """
    df = df.reset_index(drop=True)
    df["address"] = df["address"].fillna("").map(clean_address)
    codes, names = [], []
    for i, row in df.iterrows():
        if pd.isna(row["lat"]):
            point = vworld.geocode(row["address"]) if row["address"] else None
            if point is None:
                failed.append(f"{row['name']} | {row['address'] or '(주소 없음)'}")
                codes.append(""), names.append("")
                continue
            df.loc[i, ["lat", "lng"]] = point
        code, name = vworld.village(df.at[i, "lat"], df.at[i, "lng"])
        codes.append(code), names.append(name)
    df["village_id"], df["village_name"] = codes, names
    return df


def normalize(name: str) -> str:
    name = re.sub(r"\(주\)|주식회사|유한회사|\s", "", name)
    return name.replace("임실점", "")


def merge_stores(sbiz: pd.DataFrame, local: pd.DataFrame) -> pd.DataFrame:
    """LOCALDATA 영업 업소가 상가정보에 있으면(이름 일치 + 150m 이내) 상가정보 행에 표시만 한다."""
    sbiz = sbiz.copy()
    sbiz["note"] = ""
    keep = []
    for _, row in local.iterrows():
        if row["status"] == "ACTIVE":
            near = (
                ((sbiz["lat"] - row["lat"]) * 111_000) ** 2
                + ((sbiz["lng"] - row["lng"]) * 90_000) ** 2
            ) ** 0.5 < 150
            same = sbiz["name"].map(normalize) == normalize(row["name"])
            matched = sbiz.index[near & same]
            if len(matched):
                sbiz.loc[matched, "note"] = f"localdata {row['source_id']}"
                continue
        keep.append(row)
    local_only = pd.DataFrame(keep, columns=local.columns)
    local_only["note"] = local_only["status"].map(
        lambda s: "폐업 이력 (같은 주소 후속 업소 확인)" if s == "CLOSED" else "상가정보에 없음"
    )
    return pd.concat([sbiz, local_only], ignore_index=True)


def load_resources(vworld: VWorld, failed: list[str]) -> pd.DataFrame:
    centers = pd.read_csv(latest("senior_centers_imsil_*.csv"), dtype=str)
    centers = pd.DataFrame({
        "resource_type": "R03",
        "name": centers["facilityNm"].str.strip(),
        "category": "경로당",
        "address": centers["addr"],
        "source": "jeonbuk_senior_center",
        "source_id": centers["dataNo"],
    })
    welfare = pd.read_csv(latest("전북특별자치도 임실군_노인복지시설현황_*.csv"),
                          encoding="cp949", dtype=str)
    welfare = welfare[welfare["종류"].isin(WELFARE_TYPES)]
    welfare = pd.DataFrame({
        "resource_type": welfare["종류"].map(WELFARE_TYPES),
        "name": welfare["기관명"].str.strip(),
        "category": welfare["종류"],
        "address": welfare["기관주소"].str.strip(),
        "source": "imsil_senior_welfare",
        "source_id": welfare["연번"],
    })
    df = pd.concat([centers, welfare], ignore_index=True)
    df["entity_type"] = "resource"
    df["status"] = "ACTIVE"
    df["lat"], df["lng"] = float("nan"), float("nan")
    df["note"] = ""
    return locate(vworld, df, failed)


def finalize(df: pd.DataFrame, prefix: str) -> pd.DataFrame:
    df = df.sort_values(["source", "source_id"]).reset_index(drop=True)
    df["entity_id"] = [f"{prefix}_{i:04d}" for i in range(1, len(df) + 1)]
    for col in COLUMNS:
        if col not in df:
            df[col] = ""
    df["lat"] = df["lat"].round(6)
    df["lng"] = df["lng"].round(6)
    return df[COLUMNS]


def check(df: pd.DataFrame, label: str) -> int:
    """범위 밖 좌표·임실군 외 법정리코드 건수를 출력하고 반환한다. 좌표 없음은 허용한다."""
    located = df.dropna(subset=["lat"])
    outside = ~located["lat"].between(*LAT_RANGE) | ~located["lng"].between(*LNG_RANGE)
    wrong_code = ~located["village_id"].str.startswith(SIGNGU_CODE)
    invalid = located[outside | wrong_code]
    print(f"[{label}] {len(df)}건, 좌표 없음 {df['lat'].isna().sum()}건, "
          f"범위 밖 {outside.sum()}건, 임실군 외 법정리코드 {wrong_code.sum()}건")
    if len(invalid):
        print(invalid[["name", "address", "lat", "lng", "village_id"]])
    return len(invalid)


def main() -> None:
    load_dotenv()
    key = os.getenv("VWORLD_API_KEY")
    if not key:
        sys.exit(".env에 VWORLD_API_KEY가 없습니다.")
    vworld = VWorld(key)
    failed: list[str] = []
    try:
        stores = finalize(merge_stores(load_sbiz(), load_localdata(vworld, failed)), "store")
        resources = finalize(load_resources(vworld, failed), "res")
    finally:
        vworld.save()

    if failed:
        print(f"지오코딩 실패 {len(failed)}건 (좌표 빈칸으로 저장):")
        print("\n".join(f"  {line}" for line in failed))
    invalid = check(stores, "가게") + check(resources, "자원")
    if invalid:
        sys.exit(f"검증 실패 {invalid}건: 결과 파일을 저장하지 않았습니다.")

    PROCESSED.mkdir(parents=True, exist_ok=True)
    stores.to_csv(PROCESSED / "stores_imsil.csv", index=False, encoding="utf-8-sig")
    resources.to_csv(PROCESSED / "resources_imsil.csv", index=False, encoding="utf-8-sig")
    print(f"저장: stores_imsil.csv ({len(stores)}건), resources_imsil.csv ({len(resources)}건), "
          f"VWorld 호출 {vworld.calls}회")


if __name__ == "__main__":
    main()
