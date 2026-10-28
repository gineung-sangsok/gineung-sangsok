import { useEffect, useState } from "react";
import { Store, ClipboardCheck, Users, CheckCircle2, Loader2 } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import Donut from "../components/ui/Donut";
import { CardHeader } from "../components/ui/PageHeader";
import VillageMap from "../components/VillageMap";
import HouseFrame from "../components/ui/HouseFrame";
import {
  API_BASE, STAGE_LABEL,
  type ApiVillage, type Stage, type ClosureFunctionsResponse,
} from "../data/constants";

interface ClosureSummary {
  closure_id: string;
  store: { entity_id: string; name: string; village_id: string; status: string };
  closure_date: string | null;
}

const STAGE_COLORS: Record<Stage, string> = {
  registered: "#E6EAE3",
  functions: "#A9CDE6",
  inheritance: "#A3D9B8",
  reviewed: "#F3DA86",
};

export default function Dashboard() {
  const [closureList, setClosureList] = useState<ClosureSummary[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/closures`).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/villages`).then((r) => r.ok ? r.json() : []),
    ])
      .then(async ([cls, vil]: [ClosureSummary[], ApiVillage[]]) => {
        setClosureList(cls);
        setVillages(vil);
        // 각 closure의 functions를 가져와서 verified_by_officer 확인
        const fnResults = await Promise.all(
          cls.map((c) =>
            fetch(`${API_BASE}/closures/${c.closure_id}/functions`)
              .then((r) => r.ok ? r.json() as Promise<ClosureFunctionsResponse> : null)
              .catch(() => null)
          )
        );
        const reviewed = new Set<string>();
        fnResults.forEach((fn) => {
          if (fn?.verified_by_officer) reviewed.add(fn.closure_id);
        });
        setReviewedIds(reviewed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const totalClosures = closureList.length;
  const reviewedCount = reviewedIds.size;
  const pendingCount = totalClosures - reviewedCount;

  // 폐업 예정 시설이 속한 마을들의 인구 합산
  const closingVillageIds = new Set(closureList.map((c) => c.store.village_id));
  const affectedPop = villages
    .filter((v) => closingVillageIds.has(v.village_id))
    .reduce((sum, v) => sum + (v.population?.total ?? 0), 0);

  const stageCounts = (Object.keys(STAGE_LABEL) as Stage[]).map((s) => ({
    key: s,
    value: s === "reviewed" ? reviewedCount : s === "registered" ? Math.max(0, totalClosures - reviewedCount) : s === "functions" ? 0 : s === "inheritance" ? 0 : 0,
    color: STAGE_COLORS[s],
    label: STAGE_LABEL[s],
  }));

  return (
    <div>
      <VillageMap />

      {loading && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-xl bg-surface-tint border border-border text-[13px] text-text-secondary animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin" /> 대시보드 데이터를 불러오는 중...
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-4 gap-5 mb-5 stagger">
        <HouseFrame variant={0}>
          <StatCard icon={Store} label="폐업 예정 시설" value={totalClosures} suffix="곳" color="#E8957A" />
        </HouseFrame>
        <HouseFrame variant={1}>
          <StatCard icon={ClipboardCheck} label="검토 대기" value={pendingCount} suffix="건" color="#6FA8D0" />
        </HouseFrame>
        <HouseFrame variant={2}>
          <StatCard icon={Users} label="영향 인구 (추정)" value={affectedPop} suffix="명" color="#D4B24C" />
        </HouseFrame>
        <HouseFrame variant={3}>
          <StatCard icon={CheckCircle2} label="상속안 검토 완료" value={reviewedCount} suffix="건" color="#6CBF8E" />
        </HouseFrame>
      </div>

      {/* 상속 진행 현황 */}
      <div className="max-w-md mx-auto">
        <div className="card p-6">
          <CardHeader title="상속 진행 현황" />
          <div className="flex justify-center my-3">
            <Donut
              size={190}
              thickness={30}
              slices={stageCounts}
              activeKey={hoverStage}
              onHover={setHoverStage}
              center={
                <div>
                  <p className="text-[30px] font-bold leading-none tracking-tight">
                    {hoverStage ? stageCounts.find((s) => s.key === hoverStage)?.value : totalClosures}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">{hoverStage ? STAGE_LABEL[hoverStage as Stage] : "전체 시설"}</p>
                </div>
              }
            />
          </div>
          <div className="space-y-1 mt-4">
            {stageCounts.map((s) => (
              <div
                key={s.key}
                onMouseEnter={() => setHoverStage(s.key)}
                onMouseLeave={() => setHoverStage(null)}
                className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[12.5px] transition-colors ${hoverStage === s.key ? "bg-surface-secondary" : ""}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-left font-medium text-text-secondary">{s.label}</span>
                <span className="font-bold tnum">{s.value}</span>
                <span className="w-10 text-right text-text-muted tnum">{totalClosures > 0 ? Math.round((s.value / totalClosures) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
