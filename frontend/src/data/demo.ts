// ─────────────────────────────────────────────────────────────
// 공간 데이터 유틸. 백엔드 API 사용.
// ─────────────────────────────────────────────────────────────

import { API_BASE, type FnCode, type ApiVillage, type VillageGap } from "./constants";

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

/** GET /closures/{id}/gap 응답을 village_id → { F01: bool, ... } 맵으로 변환 */
export function buildGapMap(villageGaps: VillageGap[]): Map<string, Record<FnCode, boolean>> {
  const m = new Map<string, Record<FnCode, boolean>>();
  for (const vg of villageGaps) {
    if (!m.has(vg.village_id)) m.set(vg.village_id, { F01: false, F02: false, F03: false, F04: false });
    m.get(vg.village_id)![vg.function_code as FnCode] = vg.gap;
  }
  return m;
}

/**
 * 법정리별 지표 계산.
 * apiGap이 있으면 실제 공백 데이터 사용, 없으면 gap 0 (공백 없음).
 */
export function riMetrics(
  _riCode: string,
  _eupMyeon: string,
  village?: VillageRecord,
  apiGap?: Record<FnCode, boolean>,
): RiMetrics {
  const gap: Record<FnCode, number> = apiGap
    ? {
        F01: apiGap.F01 ? 80 : 15,
        F02: apiGap.F02 ? 80 : 15,
        F03: apiGap.F03 ? 80 : 15,
        F04: apiGap.F04 ? 80 : 15,
      }
    : { F01: 0, F02: 0, F03: 0, F04: 0 };
  return {
    pop: village?.total_pop ?? 0,
    aging: village ? Math.round(village.aging_rate) : 0,
    stopM: village?.nearest_stop_m ?? 0,
    gap,
    overall: Math.round((gap.F01 + gap.F02 + gap.F03 + gap.F04) / 4),
  };
}

/** GET /villages API로 마을 데이터 로드 */
export async function fetchVillages(): Promise<Map<string, VillageRecord>> {
  const res = await fetch(`${API_BASE}/villages`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const villages: ApiVillage[] = await res.json();
  const map = new Map<string, VillageRecord>();
  for (const v of villages) {
    map.set(v.village_id, {
      ri_code: v.village_id,
      ri_name: v.ri_name,
      eup_myeon: v.eup_myeon,
      total_pop: v.population?.total ?? 0,
      aging_rate: v.population?.aging_rate ?? 0,
      nearest_stop_m: v.nearest_bus_stop_m ?? 0,
    });
  }
  return map;
}
