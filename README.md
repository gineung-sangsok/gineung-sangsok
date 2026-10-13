# 기능상속

> 사라지는 지역 생활서비스를 기존 자원에 이어주는 AI 지역상생 서비스
> 2026 AI 라이프 솔루션 챌린지 출품작 (원 아이디어: 2026 AI 라이프 아이디어 챌린지 수상 후보작 「기능상속」)

## 무엇을 하나

농촌의 마지막 식료품점이 폐업하면 가게 하나가 아니라 주민의 생활기능 여러 개가 함께 사라집니다.
기능상속은 **"폐업한 가게를 무엇으로 대체할까"가 아니라 "그 가게가 하던 각 생활기능을 누가 이어받을까"** 를 묻습니다.

1. 담당자가 폐업 예정 식료품점을 등록한다
2. AI가 사라질 생활기능을 분리한다
3. 담당자가 확인·수정한다
4. 기존 자원(이동장터·농협 배송·마을회관·복지기관 등)으로 기능별 상속안을 조합한다
5. 상속 전후 공백 인구 변화를 보여준다

- **사용자:** 시·군, 읍·면 행정기관 담당자 (B2G)
- **대상 지역:** 전북 임실군
- **초기 대상 시설:** 식료품점

## 원칙 (제안서 유의점)

- AI는 폐업을 예측하지 않는다. 이미 발생했거나 예정된 중단 이후의 대안 조합만 제안한다.
- 특정 업체에 서비스를 강제 배정하지 않는다. 최종 결정은 담당자가 한다.
- 가장 가까운 시설만 추천하지 않는다. 운영시간·배송 가능 여부·이동수단·서비스 범위를 함께 고려한다.
- 공공데이터와 실제 서비스가 다를 수 있으므로 담당자 확인·수정 단계를 둔다.

## 저장소 구조

```
.
├── data/
│   ├── raw/          # 원본 데이터 (git 제외, 출처는 docs/data_sources.md에 기록)
│   ├── processed/    # 정제·지오코딩 결과 (용량 작은 것만 커밋)
│   └── labels/       # 평가용 라벨 100건 (A·B 각자 라벨 + 일치도)
├── track1_tagging/   # 트랙 1 (A): 기능 분리·자원 태깅, 베이스라인 vs LLM
├── track2_recommend/ # 트랙 2 (B): 상속안 추천·공백 분석·시나리오
├── backend/          # API 서버 (A)
├── frontend/         # 지도·대시보드 (B), 결과 화면 (A)
├── notebooks/        # 탐색용 노트북
├── tests/            # pytest
├── docs/
│   ├── contracts/    # 두 트랙의 연결 지점 3개 (10/13 확정)
│   ├── tech_stack.md
│   ├── data_sources.md
│   └── learning_log.md
└── scripts/
```

## 연결 지점 (10/13 확정)

| 연결 지점 | 문서 | 담당 |
|---|---|---|
| 기능 체계 + 태깅 결과 형식 | [docs/contracts/function_taxonomy.md](docs/contracts/function_taxonomy.md), [tagging_schema.json](docs/contracts/tagging_schema.json) | A 작성, B 리뷰 |
| 공간 데이터 형식 | [docs/contracts/spatial_schema.md](docs/contracts/spatial_schema.md) | B 작성, A 리뷰 |
| 백엔드 API 명세 | [docs/contracts/api_spec.md](docs/contracts/api_spec.md) | A 작성, B 리뷰 |

계약 문서 변경은 반드시 PR로 하고 상대의 승인을 받는다.

## 협업 규칙

자세한 내용은 [docs/workflow.md](docs/workflow.md).

- **이슈 먼저.** 모든 작업은 이슈 → 브랜치 → PR → 리뷰 → Squash merge 순서로 한다.
- `main`은 보호 브랜치. 직접 push 금지, 상대 승인 1건 + CI 통과 후 Squash merge.
- 브랜치: `<구분>/<이슈번호>-<영문-설명>` — 구분은 `t1`, `t2`, `contract`, `docs`, `fix` (예: `t1/12-keyword-baseline`)
- 커밋·PR 제목: `[T1] 키워드 베이스라인 추가`, `[T2] 접근성 계산`, `[CONTRACT] ...`, `[DOCS] ...`, `[FIX] ...`
- PR 본문에 `Closes #이슈번호`. 리뷰 요청은 당일 안에 본다.
- 매일 최소 1회 push. 매일 싱크 후 `docs/learning_log.md`에 "오늘 배운 것" 한 줄씩.
- 10/22 기능 동결 이후 `feature` 라벨 PR은 받지 않는다.
- API 키 등 비밀값은 `.env`에만 둔다. 개인정보 포함 데이터는 저장소에 올리지 않는다.

## 기술 스택

자세한 내용은 [docs/tech_stack.md](docs/tech_stack.md).

- Python 3.11+, uv, ruff, pytest
- 공간 분석: GeoPandas, OSMnx, NetworkX
- AI: GPT-5.4 mini (메인), GPT-5.4 nano·HyperCLOVA X HCX-DASH-002 (비교)
- 백엔드: FastAPI / 프론트엔드: 미정

## 실행 방법

```bash
# uv 설치: https://docs.astral.sh/uv/
uv sync                 # 의존성 설치
cp .env.example .env    # API 키 입력
uv run ruff check .     # 린트
uv run pytest           # 테스트
```

## 데이터 출처

[docs/data_sources.md](docs/data_sources.md) 참고. 모든 데이터는 출처·수집일·이용 조건을 기록한다.

## 팀

| 이름 | 트랙 | 담당 |
|---|---|---|
| A | 트랙 1: 기능 분리·자원 태깅 | 식료품점·자원 데이터, 태깅 AI, 백엔드, 배포, 등록·확인·결과 화면 |
| B | 트랙 2: 상속안 추천·공백 분석 | 인구·교통 데이터, 접근성·공백 분석, 추천 AI, 시나리오, 지도·대시보드 |
