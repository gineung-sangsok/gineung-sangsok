# 공간 데이터 형식 (v0.1 초안, 10/13 확정 예정)

## 좌표계
- **교환·저장:** EPSG:4326 (WGS84 위경도)
- **거리 계산:** EPSG:5179 (UTM-K, 미터 단위)로 변환해서 계산

## 분석 단위
- 기본 단위는 **행정리(마을)**.
- 행정리는 공식 경계 공간데이터가 없을 수 있으므로, MVP는 **마을회관·경로당 좌표를 행정리 대표점**으로 쓰고 법정리 경계는 시각화에만 쓴다. (10/13 데이터 확인 후 확정)

## 마을 단위 레코드
```json
{
  "village_id": "imsil_001",
  "admin_ri_name": "임실군 ○○면 ○○리",
  "rep_point": { "lat": 35.0, "lng": 127.0 },
  "population": { "total": 120, "age65plus": 70 },
  "nearest_bus_stop_m": 350,
  "has_food_store_2020": false
}
```

## 접근성 결과 레코드
```json
{
  "village_id": "imsil_001",
  "function_code": "F02",
  "before": { "provider_ids": ["store_0001"], "road_distance_m": 800 },
  "after":  { "provider_ids": ["res_0012"], "road_distance_m": 0, "note": "이동장터 주 1회 방문" },
  "gap": true
}
```

## 결정할 것 (10/13)
- [ ] 인구 데이터 단위 (SGIS 격자 vs 행정리 주민등록) 와 마을 단위로 합치는 방법
- [ ] "공백" 판정 기준 (예: 도로 거리 ○km 초과 + 해당 기능 제공 자원 없음)
