// ─────────────────────────────────────────────────────────────
// 계약 v1.0 기준 상수. 백엔드 schemas.py와 1:1 대응.
// ─────────────────────────────────────────────────────────────

export type FnCode = "F01" | "F02" | "F03" | "F04";
export type ResourceType = "R01" | "R02" | "R03" | "R04" | "R05";
export type FacilityStatus = "CLOSING" | "ACTIVE" | "SEASONAL" | "SUSPENDED" | "CLOSED";
export type Stage = "registered" | "functions" | "inheritance" | "reviewed";
export type TaggingSource = "llm" | "keyword" | "manual";

export const FUNCTIONS: {
  code: FnCode;
  name: string;
  short: string;
  desc: string;
  color: string;
  hex: string;
  /** 파스텔 hex 위에 올리거나 흰 바탕에 쓰는 글자·아이콘용 짙은 색 */
  deep: string;
}[] = [
  { code: "F01", name: "생필품 구매", short: "생필품", desc: "공산품·가공식품 판매", color: "bg-f01", hex: "#A3D9B8", deep: "#3E8A5E" },
  { code: "F02", name: "신선식품 구매", short: "신선식품", desc: "채소·과일·정육·수산 등 냉장 상품", color: "bg-f02", hex: "#F5B8A0", deep: "#B5603F" },
  { code: "F03", name: "무거운 상품 구매", short: "무거운 상품", desc: "쌀·생수·연료 등 들고 오기 힘든 상품, 또는 배달", color: "bg-f03", hex: "#F3DA86", deep: "#9A7A1E" },
  { code: "F04", name: "마을 생활거점", short: "생활거점", desc: "공동수령·모임·안부 확인 장소", color: "bg-f04", hex: "#A9CDE6", deep: "#3D6F92" },
];

export const FN = Object.fromEntries(FUNCTIONS.map((f) => [f.code, f])) as Record<FnCode, (typeof FUNCTIONS)[number]>;

export const RESOURCE_TYPES: Record<ResourceType, string> = {
  R01: "이동장터 노선",
  R02: "농협·지역마트 배송",
  R03: "마을회관·경로당",
  R04: "복지기관·생활지원",
  R05: "인근 상점·사회적경제",
};

export const SCORE_FACTORS: { key: "distance" | "hours" | "delivery" | "transport" | "service_area"; label: string }[] = [
  { key: "distance", label: "거리" },
  { key: "hours", label: "운영 시간" },
  { key: "delivery", label: "배송" },
  { key: "transport", label: "교통수단" },
  { key: "service_area", label: "서비스 권역" },
];
export type FactorKey = (typeof SCORE_FACTORS)[number]["key"];

export const STAGE_LABEL: Record<Stage, string> = {
  registered: "등록됨",
  functions: "기능 분석",
  inheritance: "상속안 검토",
  reviewed: "검토 완료",
};

export const TAGGING_SOURCE_LABEL: Record<TaggingSource, string> = {
  llm: "AI 분석",
  keyword: "키워드 매칭",
  manual: "수동 입력",
};

export const GAP_BINS = [
  { min: 80, color: "#B23A48", label: "80+" },
  { min: 65, color: "#E07A5F", label: "65–79" },
  { min: 50, color: "#F2B880", label: "50–64" },
  { min: 35, color: "#9CCFC2", label: "35–49" },
  { min: 0, color: "#D8ECE7", label: "<35" },
];

export function gapColor(v: number) {
  return (GAP_BINS.find((b) => v >= b.min) ?? GAP_BINS[GAP_BINS.length - 1]).color;
}

// ── 백엔드 API 응답 타입 (schemas.py 대응) ──

export const API_BASE = "http://localhost:8000";

export interface Location {
  lat: number;
  lng: number;
}

export interface FunctionTag {
  code: FnCode;
  confidence: number;
  evidence: string;
  source: TaggingSource;
}

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
  location: Location | null;
  affected_pop: number;
  functions: FnCode[];
  stage: Stage;
  verified_by_officer: boolean;
  data_sources: string[];
  updated_at: string;
}

export interface ScoreBreakdown {
  distance: number;
  hours: number;
  delivery: number;
  transport: number;
  service_area: number;
}

export interface InheritancePlan {
  function_code: FnCode;
  resource_id: string;
  resource_type: ResourceType;
  resource_name: string;
  action: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  reason: string;
  needs_officer_check: boolean;
}

export interface ClosureFunctionsResponse {
  closure_id: string;
  functions: FunctionTag[];
  verified_by_officer: boolean;
}

export interface InheritanceResponse {
  closure_id: string;
  plans: InheritancePlan[];
  uncovered_functions: FnCode[];
}

export interface VillageGap {
  village_id: string;
  function_code: FnCode;
  before: { provider_ids: string[]; distance_m: number | null; note: string | null };
  after: { provider_ids: string[]; distance_m: number | null; note: string | null };
  gap: boolean;
}

export interface GapResponse {
  closure_id: string;
  villages: VillageGap[];
  summary: { gap_population_before: number; gap_population_after: number };
}

