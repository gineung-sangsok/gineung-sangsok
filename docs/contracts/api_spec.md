# 백엔드 API 명세 (v0.1 초안, 10/13 확정 예정)

| 메서드 | 경로 | 설명 | 데모 단계 |
|---|---|---|---|
| POST | `/closures` | 폐업 예정 시설 등록 | ① 등록 |
| GET | `/closures/{id}/functions` | AI 기능 분리 결과 | ② 기능 분리 |
| PATCH | `/closures/{id}/functions` | 담당자 확인·수정 저장 | ③ 확인·수정 |
| GET | `/closures/{id}/inheritance` | 기능별 상속안 조합 + 추천 사유 | ④ 상속안 |
| GET | `/closures/{id}/gap` | 상속 전후 공백 인구 변화 | ⑤ 공백 변화 |
| GET | `/resources` | 상속 자원 목록 (지도 표시용) | 공통 |
| GET | `/villages` | 마을 단위 공간 데이터 | 공통 |
| POST | `/scenarios` | 시나리오 분석 (예: 이동장터 노선 추가) | 확장 |

## 상속안 응답 예시
```json
{
  "closure_id": "store_0001",
  "plans": [
    {
      "function_code": "F01",
      "resource_id": "res_0003",
      "resource_type": "R01",
      "action": "기존 이동장터 노선에 주 1회 방문 추가 검토",
      "score": 0.82,
      "score_breakdown": { "distance": 0.9, "hours": 0.7, "delivery": 1.0, "transport": 0.8, "service_area": 0.7 },
      "reason": "LLM 생성 추천 사유",
      "needs_officer_check": true
    }
  ],
  "uncovered_functions": ["F04"]
}
```
