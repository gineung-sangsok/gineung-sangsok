# 기술 스택

> 방향: Python 하나로 통일 + 무거운 계산은 미리 해서 파일로 저장 + 가벼운 프론트엔드

| 영역 | 선택 | 이유 |
|---|---|---|
| 언어 | Python 3.11+ | 한 언어로 통일해 서로 PR 리뷰 가능 |
| 공간 분석 | GeoPandas, Shapely, pyproj, OSMnx + NetworkX | 좌표계 변환(4326↔5179), 도로망 거리 계산 |
| 지오코딩 | 브이월드 지오코더 API | 국내 주소 체계 지원, 배경지도와 같은 키 |
| AI | GPT-5.4 mini (메인) + 구조화 출력 + Pydantic 검증 | 태깅 결과를 계약 형식에 맞게 강제 |
| AI 비교 | GPT-5.4 nano, HyperCLOVA X HCX-DASH-002 | 100건 평가셋으로 비용·국내 모델 비교 |
| 평가 | scikit-learn | 정확도·F1, 코헨 카파 |
| 백엔드 | FastAPI + Pydantic | API 문서(OpenAPI) 자동 생성 |
| 저장 | Parquet/GeoJSON + SQLite | 임실군 규모는 메모리로 충분, SQLite는 담당자 수정 내역용 |
| 프론트엔드 | React + Vite + Leaflet 또는 Streamlit + Folium | 미정 (아래) |
| 배경지도 | 브이월드 (또는 OSM) | 국내 공공 지도, B2G 설정과 맞음 |
| 배포 | 프론트 Vercel / 백엔드 Render | 백엔드는 11월 말까지 최저 유료 플랜 |
| 개발 환경 | uv, ruff, GitHub Actions (ruff + pytest) | 가벼운 세팅 + CI |

## 설계 원칙

1. **미리 계산:** 거리 행렬·접근성·태깅 결과는 오프라인 스크립트로 한 번 계산해 Parquet로 저장. API는 읽어서 조합만 한다.
2. **LLM 캐시:** 입력 해시를 키로 JSON 파일에 결과 저장, 같은 입력은 재사용. 데모 시나리오의 추천 사유는 미리 생성.
3. **로직 분리:** track1_tagging, track2_recommend는 일반 Python 패키지. FastAPI는 불러다 쓰기만 한다.
4. **LLM 호출은 함수 하나로 감싼다:** 모델 교체·비교를 위해 호출 지점을 한 곳으로 모은다.
5. **비밀값:** OpenAI 키는 백엔드 .env에만 둔다. 프론트엔드에서 직접 호출 금지.

## 결정할 것

- [ ] 프론트엔드: React 경험자 있으면 React + Vite + Leaflet, 없으면 Streamlit + Folium
  - Streamlit이면 FastAPI 없이 단일 앱 → A의 역할을 "Streamlit 앱 구조·배포"로 변경
- [x] LLM: GPT-5.4 mini (날짜 스냅샷으로 고정, 이름은 README에 기록)
- [x] 백엔드 호스팅: Render

## 확인할 것

- [ ] 10/13~14: 임실군 OSM 도로망에 마을회관이 연결되는지 확인 (부족하면 브이월드·국가교통DB 도로망 또는 직선거리 보정)
- [ ] 10/21: 배포 주소를 브이월드 키에 등록
- [ ] 무료 백엔드는 잠들 수 있음. 심사·투표 기간(11월 말까지) 반드시 깨어 있게 유지
