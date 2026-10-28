// ─────────────────────────────────────────────────────────────
// UI 컴포넌트용 상수 + 공간 데이터 유틸.
// 하드코딩 데모 데이터는 제거됨 — 백엔드 API 사용.
// ─────────────────────────────────────────────────────────────

export type FnCode = "F01" | "F02" | "F03" | "F04";

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

export type Stage = "registered" | "functions" | "inheritance" | "reviewed";

export const STAGE_LABEL: Record<Stage, string> = {
  registered: "등록됨",
  functions: "기능 분석",
  inheritance: "상속안 검토",
  reviewed: "검토 완료",
};

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
  { min: 80, color: "#EE9A80", label: "80+" },
  { min: 65, color: "#F5BBA2", label: "65–79" },
  { min: 50, color: "#F3DA86", label: "50–64" },
  { min: 35, color: "#CDE8D4", label: "35–49" },
  { min: 0, color: "#EEF6EE", label: "<35" },
];
export function gapColor(v: number) {
  return (GAP_BINS.find((b) => v >= b.min) ?? GAP_BINS[GAP_BINS.length - 1]).color;
}
