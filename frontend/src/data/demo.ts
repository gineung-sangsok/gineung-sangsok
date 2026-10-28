// ─────────────────────────────────────────────────────────────
// 데모/임시 데이터 — 백엔드 API가 없는 항목만 남김.
// 상수와 타입은 constants.ts에서 관리.
// ─────────────────────────────────────────────────────────────

import { type FnCode, type Facility, type FacilityStatus, type Stage, FUNCTIONS, RESOURCE_TYPES } from "./constants";

// re-export for backward compat (DemoStore, DataManagement 등)
export type { FnCode, Facility, FacilityStatus, Stage };

// ── 시설 목록 (백엔드에 GET /closures 목록 API 미구현) ──
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

// ── 데이터 관리 탭 (백엔드에 집계 API 미구현) ──
export const DATA_ROWS: Record<string, { name: string; type: string; ri: string; fns: FnCode[]; status: string; source: string; verified: boolean; updated: string }[]> = {
  시설: FACILITIES.map((f) => ({
    name: f.name, type: f.biz_type, ri: `${f.eup_myeon} ${f.ri}`, fns: f.functions, status: f.status,
    source: "사업자 신고 정보", verified: f.stage === "reviewed" || f.entity_id === "store_0001", updated: f.updated_at,
  })),
  자원: [
    { name: "임실 이동장터 3호 노선", type: RESOURCE_TYPES.R01, ri: "삼계면 일대", fns: ["F01" as FnCode, "F02" as FnCode], status: "ACTIVE", source: "임실군 생활지원과", verified: true, updated: "2026-10-18" },
    { name: "삼계농협 하나로마트", type: RESOURCE_TYPES.R02, ri: "삼계면 일대", fns: ["F01" as FnCode, "F03" as FnCode], status: "ACTIVE", source: "농협 운영 자료", verified: false, updated: "2026-10-17" },
    { name: "삼계면 사회적협동조합 상점", type: RESOURCE_TYPES.R05, ri: "삼계면 일대", fns: ["F01" as FnCode], status: "ACTIVE", source: "임실군 생활지원과", verified: true, updated: "2026-10-16" },
    { name: "임실로컬푸드 직매장", type: RESOURCE_TYPES.R02, ri: "삼계면 일대", fns: ["F02" as FnCode], status: "ACTIVE", source: "농협 운영 자료", verified: true, updated: "2026-10-15" },
    { name: "죽계리 마을회관", type: RESOURCE_TYPES.R03, ri: "삼계면 일대", fns: ["F04" as FnCode], status: "ACTIVE", source: "임실군 생활지원과", verified: false, updated: "2026-10-14" },
    { name: "임실군 생활지원센터", type: RESOURCE_TYPES.R04, ri: "삼계면 일대", fns: ["F03" as FnCode], status: "ACTIVE", source: "임실군 생활지원과", verified: true, updated: "2026-10-13" },
  ],
  인구: ["죽계리", "홍곡리", "산수리", "갈담리", "회진리", "용수리", "군평리", "금암리"].map((ri, i) => ({
    name: `${ri} 주민등록인구`, type: "인구 통계", ri, fns: [], status: "ACTIVE",
    source: "행정안전부 주민등록 인구", verified: i % 4 !== 3, updated: "2026-09-30",
  })),
  "공간 데이터": [
    { name: "법정리 경계", type: "Polygon", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "국토지리정보원", verified: true, updated: "2026-10-15" },
    { name: "버스 정류장", type: "Point", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "국가대중교통정보센터", verified: true, updated: "2026-10-01" },
    { name: "도로망", type: "LineString", ri: "임실군 전역", fns: [], status: "ACTIVE", source: "VWorld", verified: true, updated: "2026-08-20" },
    { name: "이동장터 노선", type: "LineString", ri: "임실군 6개 면", fns: ["F01" as FnCode, "F02" as FnCode], status: "SEASONAL", source: "임실군 생활지원과", verified: false, updated: "2026-10-12" },
  ],
  "데이터 출처": [
    { name: "사업자 신고 정보", type: "공공데이터", ri: "-", fns: [], status: "ACTIVE", source: "국세청", verified: true, updated: "2026-10-01" },
    { name: "주민 인터뷰 기록", type: "현장 조사", ri: "삼계면", fns: ["F01" as FnCode, "F03" as FnCode, "F04" as FnCode], status: "ACTIVE", source: "임실군 담당자", verified: false, updated: "2026-10-17" },
    { name: "농협 배송 권역", type: "기관 자료", ri: "임실군 전역", fns: ["F01" as FnCode, "F03" as FnCode], status: "ACTIVE", source: "임실농협", verified: true, updated: "2026-09-25" },
  ],
};

// ── 공간 분석용 (백엔드 gap API 연동 전) ──
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

function hash(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function riMetrics(riCode: string, eupMyeon: string, village?: VillageRecord): RiMetrics {
  const town = eupMyeon === "임실읍" ? 0.55 : eupMyeon === "오수면" || eupMyeon === "관촌면" ? 0.8 : 1;
  const g = (salt: number) => Math.round(Math.min(98, (20 + hash(riCode, salt) * 78) * town));
  const gap = { F01: g(1), F02: g(2), F03: g(3), F04: g(4) } as Record<FnCode, number>;
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
