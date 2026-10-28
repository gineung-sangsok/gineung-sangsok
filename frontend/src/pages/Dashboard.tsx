import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ClipboardCheck, Users, CheckCircle2, Loader2 } from "lucide-react";
import StatCard from "../components/ui/StatCard";
import Donut from "../components/ui/Donut";
import { CardHeader } from "../components/ui/PageHeader";
import VillageMap from "../components/VillageMap";
import HouseFrame from "../components/ui/HouseFrame";
import { API_BASE, STAGE_LABEL, type ApiEntity, type ApiVillage, type Stage } from "../data/constants";

const STAGE_COLORS: Record<Stage, string> = {
  registered: "#E6EAE3",
  functions: "#A9CDE6",
  inheritance: "#A3D9B8",
  reviewed: "#F3DA86",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<ApiEntity[]>([]);
  const [villages, setVillages] = useState<ApiVillage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/resources`).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/villages`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([res, vil]: [ApiEntity[], ApiVillage[]]) => {
        setFacilities(res);
        setVillages(vil);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const stores = facilities.filter((f) => f.entity_type === "store");
  const closing = stores.filter((f) => f.status === "CLOSING").length;
  const reviewed = stores.filter((f) => f.verified_by_officer).length;
  const pending = stores.length - reviewed;

  // 폐업 예정 시설이 속한 마을들의 인구 합산
  const closingVillageIds = new Set(stores.filter((f) => f.status !== "ACTIVE").map((f) => f.village_id));
  const affectedPop = villages
    .filter((v) => closingVillageIds.has(v.village_id))
    .reduce((sum, v) => sum + (v.population?.total ?? 0), 0);

  const stageCounts = (Object.keys(STAGE_LABEL) as Stage[]).map((s) => ({
    key: s,
    value: s === "reviewed" ? reviewed : s === "registered" ? Math.max(0, stores.length - closing) : s === "functions" ? closing - reviewed : s === "inheritance" ? 0 : 0,
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
          <StatCard icon={Store} label="폐업 예정 시설" value={closing} suffix="곳" color="#E8957A" />
        </HouseFrame>
        <HouseFrame variant={1}>
          <StatCard icon={ClipboardCheck} label="검토 대기" value={pending} suffix="건" color="#6FA8D0" />
        </HouseFrame>
        <HouseFrame variant={2}>
          <StatCard icon={Users} label="영향 인구 (추정)" value={affectedPop} suffix="명" color="#D4B24C" />
        </HouseFrame>
        <HouseFrame variant={3}>
          <StatCard icon={CheckCircle2} label="상속안 검토 완료" value={reviewed} suffix="건" color="#6CBF8E" />
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
                    {hoverStage ? stageCounts.find((s) => s.key === hoverStage)?.value : stores.length}
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
                <span className="w-10 text-right text-text-muted tnum">{stores.length > 0 ? Math.round((s.value / stores.length) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
