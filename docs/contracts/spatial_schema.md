# 공간 데이터 형식 (v1.0, 10/13 회의 확정)

## 좌표계
- **교환·저장:** EPSG:4326 (WGS84 위경도)
- **거리 계산:** EPSG:5179 (UTM-K, 미터 단위)로 변환해서 계산

## 분석 단위
- 기본 단위는 **법정리**.
- 법정리 경계는 LX 법정구역경계 shapefile 기준 (`data/processed/legal_ri_imsil.geojson`).
- 대표점: 법정리 안의 마을회관·경로당 좌표 → 없으면 법정리 경계 중심점.

## 마을(법정리) 단위 레코드
```json
{
  "village_id": "5275037025",
  "ri_name": "죽계리",
  "eup_myeon": "삼계면",
  "rep_point": { "lat": 35.520183, "lng": 127.240828 },
  "population": {
    "total": 101,
    "age65plus": 52,
    "aging_rate": 51.5,
    "source": "estimate",
    "year": 2020
  },
  "nearest_bus_stop_m": 386,
  "has_food_store": false
}
```

## 가게·자원 village_id
- `village_id`는 **법정리코드 10자리** 문자열.
- 상가정보 API의 법정동코드(10자리)와 동일 키로 직접 조인 가능.

## 인구 데이터 기준
- 1순위: SGIS 격자 인구 → 법정리 경계로 집계
- 격자 미확보 시: 읍면 인구 ÷ 법정리 수 균등 배분, `source: "estimate"` 표시

## 접근성 결과 레코드
```json
{
  "village_id": "5275037025",
  "function_code": "F02",
  "before": { "provider_ids": ["store_0001"], "distance_m": 800 },
  "after":  { "provider_ids": ["res_0012"], "distance_m": 0, "note": "이동장터 주 1회 방문" },
  "gap": true
}
```

## 공백 판정 기준 (임시값, ~10/16 확정)
- 해당 기능 제공처까지 도로 거리 **1km 초과** → 공백 후보
- 해당 기능 이동장터가 **주 1회 이상**(weekly_visits ≥ 1) 방문 → "부분 해소"
- 이동장터 F02(신선식품)는 판매 품목 확인 시에만 인정

## 파일 형식
- 마을·자원: GeoJSON
- 접근성 결과: Parquet
