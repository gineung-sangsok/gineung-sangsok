// ─────────────────────────────────────────────────────────────
// 데모 데이터 — API 연결 전 UI 시연용 샘플입니다.
// 실제 API가 연결되면 이 파일 대신 응답 데이터를 사용하세요.
// ─────────────────────────────────────────────────────────────

export type FnCode = "F01" | "F02" | "F03" | "F04";

export const FUNCTIONS: {
  code: FnCode;
  name: string;
  short: string;
  desc: string;
  color: string;
  hex: string;
}[] = [
  { code: "F01", name: "생필품 구매", short: "생필품", desc: "공산품·가공식품 판매", color: "bg-f01", hex: "#6B8F3E" },
  { code: "F02", name: "신선식품 구매", short: "신선식품", desc: "채소·과일·정육·수산 등 냉장 상품", color: "bg-f02", hex: "#2E6B4F" },
  { code: "F03", name: "무거운 상품 구매", short: "무거운 상품", desc: "쌀·생수·연료 등 들고 오기 힘든 상품, 또는 배달", color: "bg-f03", hex: "#B07A3B" },
  { code: "F04", name: "마을 생활거점", short: "생활거점", desc: "공동수령·모임·안부 확인 장소", color: "bg-f04", hex: "#5F7F8C" },
];

export const FN = Object.fromEntries(FUNCTIONS.map((f) => [f.code, f])) as Record<FnCode, (typeof FUNCTIONS)[number]>;

export type FacilityStatus = "CLOSING" | "ACTIVE" | "SEASONAL" | "SUSPENDED" | "CLOSED";
export type Stage = "registered" | "functions" | "inheritance" | "reviewed";

export const STAGE_LABEL: Record<Stage, string> = {
  registered: "등록됨",
  functions: "기능 분석",
  inheritance: "상속안 검토",
  reviewed: "검토 완료",
};

export interface Facility {
  entity_id: string;
  entity_type: "store" | "resource";
  name: string;
  biz_type: string;
  status: FacilityStatus;
  closure_date: string | null;
  village_id: string;
  eup_myeon: string;
  ri: string;
  address: string;
  location: { lat: number; lng: number } | null;
  affected_pop: number;
  functions: FnCode[];
  stage: Stage;
  verified_by_officer: boolean;
  data_sources: string[];
  updated_at: string;
}

export const FACILITIES: Facility[] = [
  { entity_id: "store_0001", entity_type: "store", name: "죽계상회", biz_type: "식료품점", status: "CLOSING", closure_date: "2026-12-31", village_id: "5275037001", eup_myeon: "삼계면", ri: "죽계리", address: "전북 임실군 삼계면 죽계리 123", location: null, affected_pop: 214, functions: ["F01", "F02", "F03", "F04"], stage: "inheritance", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-10-18" },
  { entity_id: "store_0002", entity_type: "store", name: "갈담슈퍼", biz_type: "슈퍼마켓", status: "CLOSING", closure_date: "2026-11-30", village_id: "5275037002", eup_myeon: "강진면", ri: "갈담리", address: "전북 임실군 강진면 갈담리 45", location: null, affected_pop: 388, functions: ["F01", "F02", "F03"], stage: "functions", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-10-16" },
  { entity_id: "store_0003", entity_type: "store", name: "옥정상회", biz_type: "식료품점", status: "SUSPENDED", closure_date: "2027-01-15", village_id: "5275037003", eup_myeon: "운암면", ri: "옥정리", address: "전북 임실군 운암면 옥정리 8", location: null, affected_pop: 132, functions: ["F01", "F04"], stage: "registered", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-10-14" },
  { entity_id: "store_0004", entity_type: "store", name: "필봉정육점", biz_type: "정육점", status: "CLOSING", closure_date: "2026-12-10", village_id: "5275037004", eup_myeon: "강진면", ri: "필봉리", address: "전북 임실군 강진면 필봉리 201", location: null, affected_pop: 176, functions: ["F02"], stage: "reviewed", verified_by_officer: true, data_sources: ["사업자 신고 정보"], updated_at: "2026-10-09" },
  { entity_id: "store_0005", entity_type: "store", name: "신덕농협하나로", biz_type: "농협마트", status: "SEASONAL", closure_date: "2027-02-28", village_id: "5275037005", eup_myeon: "신덕면", ri: "신덕리", address: "전북 임실군 신덕면 신덕리 67", location: null, affected_pop: 512, functions: ["F01", "F02", "F03"], stage: "inheritance", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-10-05" },
  { entity_id: "store_0006", entity_type: "store", name: "학석상점", biz_type: "식료품점", status: "CLOSING", closure_date: "2026-11-20", village_id: "5275037006", eup_myeon: "관촌면", ri: "학석리", address: "전북 임실군 관촌면 학석리 12", location: null, affected_pop: 98, functions: ["F01", "F03", "F04"], stage: "functions", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-09-29" },
  { entity_id: "store_0007", entity_type: "store", name: "오수방앗간", biz_type: "정미소", status: "CLOSED", closure_date: "2026-09-30", village_id: "5275037007", eup_myeon: "오수면", ri: "주천리", address: "전북 임실군 오수면 주천리 33", location: null, affected_pop: 241, functions: ["F03"], stage: "reviewed", verified_by_officer: true, data_sources: ["사업자 신고 정보"], updated_at: "2026-09-21" },
  { entity_id: "store_0008", entity_type: "store", name: "두월상회", biz_type: "식료품점", status: "CLOSING", closure_date: "2027-03-31", village_id: "5275037008", eup_myeon: "성수면", ri: "두월리", address: "전북 임실군 성수면 두월리 90", location: null, affected_pop: 156, functions: ["F01", "F02", "F04"], stage: "registered", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-09-18" },
  { entity_id: "store_0009", entity_type: "store", name: "회진슈퍼", biz_type: "슈퍼마켓", status: "CLOSING", closure_date: "2026-12-20", village_id: "5275037009", eup_myeon: "덕치면", ri: "회진리", address: "전북 임실군 덕치면 회진리 4", location: null, affected_pop: 203, functions: ["F01", "F02", "F03", "F04"], stage: "inheritance", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-09-11" },
  { entity_id: "store_0010", entity_type: "store", name: "금평연쇄점", biz_type: "식료품점", status: "ACTIVE", closure_date: "2027-06-30", village_id: "5275037010", eup_myeon: "청웅면", ri: "금평리", address: "전북 임실군 청웅면 금평리 18", location: null, affected_pop: 119, functions: ["F01"], stage: "registered", verified_by_officer: false, data_sources: ["사업자 신고 정보"], updated_at: "2026-09-02" },
];

// 데모 시설의 기능 분석 결과
export type TaggingSource = "llm" | "keyword" | "manual";
export const TAGGING_SOURCE_LABEL: Record<TaggingSource, string> = { llm: "AI 분석", keyword: "키워드 매칭", manual: "수동 입력" };

export interface FunctionResult {
  code: FnCode;
  confidence: number | null;
  evidence: string;
  source: TaggingSource;
  quote: string;
}

export const FUNCTION_RESULTS: FunctionResult[] = [
  { code: "F01", confidence: 0.86, evidence: "라면·휴지·세제 등 공산품 상시 판매", source: "llm", quote: "\"동네에서 휴지랑 라면 사려면 여기밖에 없어요.\" — 주민 인터뷰 #3" },
  { code: "F02", confidence: 0.52, evidence: "냉장 진열대 1대, 두부·계란 소량 판매", source: "keyword", quote: "냉장 설비 보유 기록은 있으나 판매 품목 범위는 확인되지 않음" },
  { code: "F03", confidence: 0.71, evidence: "쌀 20kg·생수 배달 (주 2회)", source: "llm", quote: "\"쌀은 사장님이 트럭으로 갖다줬지.\" — 주민 인터뷰 #7" },
  { code: "F04", confidence: 0.34, evidence: "가게 앞 평상, 택배 대리 수령", source: "manual", quote: "모임 장소 역할은 관찰되었으나 정기성 여부는 확인 필요" },
];

// 상속 후보 자원
export type ResourceType = "R01" | "R02" | "R03" | "R04" | "R05";
export const RESOURCE_TYPES: Record<ResourceType, string> = {
  R01: "이동장터 노선",
  R02: "농협·지역마트 배송",
  R03: "마을회관·경로당",
  R04: "복지기관·생활지원",
  R05: "인근 상점·사회적경제",
};

export const SCORE_FACTORS = [
  { key: "distance", label: "거리" },
  { key: "hours", label: "운영 시간" },
  { key: "delivery", label: "배송" },
  { key: "transport", label: "교통수단" },
  { key: "service_area", label: "서비스 권역" },
] as const;
export type FactorKey = (typeof SCORE_FACTORS)[number]["key"];

export interface Candidate {
  id: string;
  fn: FnCode;
  name: string;
  type: ResourceType;
  distanceKm: number;
  weekly: string;
  scores: Record<FactorKey, number>;
  note: string;
}

const c = (
  id: string, fn: FnCode, name: string, type: ResourceType, distanceKm: number, weekly: string,
  s: [number, number, number, number, number], note: string,
): Candidate => ({
  id, fn, name, type, distanceKm, weekly, note,
  scores: { distance: s[0], hours: s[1], delivery: s[2], transport: s[3], service_area: s[4] },
});

export const CANDIDATES: Candidate[] = [
  c("r1", "F01", "임실 이동장터 3호 노선", "R01", 0.4, "주 2회 (화·금)", [92, 64, 40, 88, 82], "노선에 죽계리 정차 추가 시 도보 5분 이내"),
  c("r2", "F01", "삼계농협 하나로마트", "R02", 6.8, "주 3회 배송", [46, 78, 95, 84, 90], "전화 주문 → 익일 배송, 최소 주문 1만원"),
  c("r3", "F01", "삼계면 사회적협동조합 상점", "R05", 3.1, "평일 상시", [58, 90, 30, 52, 74], "버스 1회 환승 필요"),
  c("r4", "F02", "임실 이동장터 3호 노선", "R01", 0.4, "주 2회 (화·금)", [92, 58, 36, 80, 72], "냉장 탑차 운영 — 신선식품 취급 가능"),
  c("r5", "F02", "임실로컬푸드 직매장", "R02", 11.2, "주 1회 배송", [30, 42, 85, 70, 92], "꾸러미 정기배송 프로그램 신청 필요"),
  c("r6", "F03", "삼계농협 하나로마트", "R02", 6.8, "주 3회 배송", [46, 78, 96, 88, 90], "쌀·생수·LPG 배송 가능"),
  c("r7", "F03", "임실군 생활지원센터", "R04", 9.4, "요청 시", [38, 40, 80, 52, 58], "고령 단독가구 우선 지원"),
  c("r8", "F04", "죽계리 마을회관", "R03", 0.2, "상시 개방", [98, 96, 10, 92, 70], "택배 공동수령함 설치 검토"),
  c("r9", "F04", "삼계면 경로당 연합", "R03", 1.6, "평일 상시", [74, 80, 10, 84, 62], "안부 확인 프로그램 운영 중"),
  c("r10", "F04", "임실군 노인복지관 분관", "R04", 7.9, "주 2회 방문", [40, 46, 20, 64, 82], "찾아가는 돌봄 연계 가능"),
];

export function totalScore(cand: Candidate) {
  const v = Object.values(cand.scores);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

// 대시보드 추이
export const MONTHLY = [
  { m: "11월", closures: 2, gaps: 18, resolved: 1 },
  { m: "12월", closures: 3, gaps: 21, resolved: 2 },
  { m: "1월", closures: 1, gaps: 20, resolved: 3 },
  { m: "2월", closures: 4, gaps: 26, resolved: 2 },
  { m: "3월", closures: 2, gaps: 25, resolved: 4 },
  { m: "4월", closures: 3, gaps: 27, resolved: 3 },
  { m: "5월", closures: 5, gaps: 31, resolved: 4 },
  { m: "6월", closures: 2, gaps: 29, resolved: 5 },
  { m: "7월", closures: 3, gaps: 30, resolved: 3 },
  { m: "8월", closures: 4, gaps: 33, resolved: 4 },
  { m: "9월", closures: 3, gaps: 31, resolved: 6 },
  { m: "10월", closures: 6, gaps: 36, resolved: 5 },
];

export const EUP_MYEON_GAP = [
  { name: "덕치면", score: 78 },
  { name: "삼계면", score: 74 },
  { name: "신평면", score: 69 },
  { name: "운암면", score: 66 },
  { name: "강진면", score: 61 },
  { name: "청웅면", score: 58 },
  { name: "지사면", score: 55 },
  { name: "성수면", score: 51 },
  { name: "신덕면", score: 47 },
  { name: "관촌면", score: 42 },
  { name: "오수면", score: 36 },
  { name: "임실읍", score: 22 },
];

export const FUNCTION_GAP_RATE: Record<FnCode, number> = { F01: 42, F02: 63, F03: 37, F04: 28 };

export const NOTIFICATIONS = [
  { id: 1, title: "갈담슈퍼 폐업 예정일이 40일 남았습니다", time: "10분 전", kind: "warn" as const, to: "/closures/store_0002/functions" },
  { id: 2, title: "죽계상회 F02 신뢰도 확인 요청", time: "1시간 전", kind: "info" as const, to: "/closures/store_0001/functions" },
  { id: 3, title: "필봉정육점 상속안 검토가 완료되었습니다", time: "어제", kind: "ok" as const, to: "/closures/store_0004/review" },
  { id: 4, title: "이동장터 3호 노선 운행 정보가 갱신되었습니다", time: "2일 전", kind: "info" as const, to: "/data" },
];

// ── 공간 데이터: 법정리별 지표
// gap 점수는 백엔드 공백 분석 API 연결 전까지 ri_code 해시 기반으로 결정적 생성
function hash(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export interface VillageRecord {
  ri_code: string;
  ri_name: string;
  eup_myeon: string;
  total_pop: number;
  aging_rate: number;
  nearest_stop_m: number;
}

export interface RiMetrics {
  pop: number;
  aging: number;
  stopM: number;
  gap: Record<FnCode, number>;
  overall: number;
}

export function riMetrics(riCode: string, eupMyeon: string, village?: VillageRecord): RiMetrics {
  const town = eupMyeon === "임실읍" ? 0.55 : eupMyeon === "오수면" || eupMyeon === "관촌면" ? 0.8 : 1;
  const g = (salt: number) => Math.round(Math.min(98, (20 + hash(riCode, salt) * 78) * town));
  const gap = { F01: g(1), F02: g(2), F03: g(3), F04: g(4) };
  return {
    pop: village?.total_pop ?? Math.round(60 + hash(riCode, 9) * (eupMyeon === "임실읍" ? 1400 : 420)),
    aging: village ? Math.round(village.aging_rate) : Math.round(32 + hash(riCode, 7) * 30),
    stopM: village?.nearest_stop_m ?? Math.round(120 + hash(riCode, 5) * 2400 * town),
    gap,
    overall: Math.round((gap.F01 + gap.F02 + gap.F03 + gap.F04) / 4),
  };
}

export async function fetchVillages(): Promise<Map<string, VillageRecord>> {
  const res = await fetch("/data/villages_ri.csv");
  const text = await res.text();
  const lines = text.trim().replace(/^\uFEFF/, "").split("\n");
  const map = new Map<string, VillageRecord>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    map.set(cols[0], {
      ri_code: cols[0],
      ri_name: cols[1],
      eup_myeon: cols[2],
      total_pop: Number(cols[5]),
      aging_rate: Number(cols[7]),
      nearest_stop_m: Number(cols[12]),
    });
  }
  return map;
}

export const GAP_BINS = [
  { min: 80, color: "#7A3E2B", label: "80+" },
  { min: 65, color: "#B5643C", label: "65–79" },
  { min: 50, color: "#D9B77A", label: "50–64" },
  { min: 35, color: "#B9CC92", label: "35–49" },
  { min: 0, color: "#E6EBD3", label: "<35" },
];
export function gapColor(v: number) {
  return (GAP_BINS.find((b) => v >= b.min) ?? GAP_BINS[GAP_BINS.length - 1]).color;
}

// 데이터 관리 탭 데이터
export const DATA_ROWS: Record<string, { name: string; type: string; ri: string; fns: FnCode[]; status: string; source: string; verified: boolean; updated: string }[]> = {
  시설: FACILITIES.map((f) => ({
    name: f.name, type: f.biz_type, ri: `${f.eup_myeon} ${f.ri}`, fns: f.functions, status: f.status,
    source: "사업자 신고 정보", verified: f.stage === "reviewed" || f.entity_id === "store_0001", updated: f.updated_at,
  })),
  자원: Array.from(new Map(CANDIDATES.map((x) => [x.name, x])).values()).map((x, i) => ({
    name: x.name, type: RESOURCE_TYPES[x.type], ri: "삼계면 일대",
    fns: CANDIDATES.filter((y) => y.name === x.name).map((y) => y.fn), status: "ACTIVE",
    source: i % 2 ? "임실군 생활지원과" : "농협 운영 자료", verified: i % 3 !== 1, updated: `2026-10-${String(18 - i).padStart(2, "0")}`,
  })),
  인구: ["죽계리", "홍곡리", "산수리", "갈담리", "회진리", "용수리", "군평리", "금암리"].map((ri, i) => ({
    name: `${ri} 주민등록인구`, type: "인구 통계", ri, fns: [], status: "ACTIVE",
    source: "행정안전부 주민등록 인구", verified: i % 4 !== 3, updated: "2026-09-30",
  })),
  "공간 데이터": [
    { name: "법정리 경계", type: "Polygon", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "국토지리정보원", verified: true, updated: "2026-10-15" },
    { name: "버스 정류장", type: "Point", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "국가대중교통정보센터", verified: true, updated: "2026-10-01" },
    { name: "도로망", type: "LineString", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "VWorld", verified: true, updated: "2026-08-20" },
    { name: "이동장터 노선", type: "LineString", ri: "임실군 6개 면", fns: ["F01", "F02"], status: "SEASONAL", source: "임실군 생활지원과", verified: false, updated: "2026-10-12" },
  ],
  "데이터 출처": [
    { name: "사업자 신고 정보", type: "공공데이터", ri: "-", fns: [], status: "ACTIVE", source: "국세청", verified: true, updated: "2026-10-01" },
    { name: "주민 인터뷰 기록", type: "현장 조사", ri: "삼계면", fns: ["F01", "F03", "F04"], status: "ACTIVE", source: "임실군 담당자", verified: false, updated: "2026-10-17" },
    { name: "농협 배송 권역", type: "기관 자료", ri: "임실군 전역", fns: ["F01", "F03"], status: "ACTIVE", source: "임실농협", verified: true, updated: "2026-09-25" },
  ],
};
