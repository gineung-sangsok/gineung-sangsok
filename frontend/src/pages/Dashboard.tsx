import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ClipboardCheck, Users, CheckCircle2, Plus, Search, ArrowUpDown, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import StatCard from "../components/ui/StatCard";
import StatusBadge, { FACILITY_STATUS_BADGE } from "../components/ui/StatusBadge";
import Donut from "../components/ui/Donut";
import Segmented from "../components/ui/Segmented";
import Dropdown from "../components/ui/Dropdown";
import { CardHeader } from "../components/ui/PageHeader";
import VillageMap from "../components/VillageMap";
import FunctionIcon from "../components/ui/FunctionIcon";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { EUP_MYEON_GAP, FN, FUNCTIONS, FUNCTION_GAP_RATE, MONTHLY, STAGE_LABEL, type Stage } from "../data/demo";
import { useDemo } from "../store/DemoStore";

const STAGE_COLORS: Record<Stage, string> = {
  registered: "#E6EAE3",
  functions: "#A9CDE6",
  inheritance: "#A3D9B8",
  reviewed: "#F3DA86",
};

type Metric = "gaps" | "closures" | "resolved";
const METRIC_LABEL: Record<Metric, string> = { gaps: "공백 법정리 수", closures: "신규 폐업 예정", resolved: "공백 해소" };

function ChartTip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-ink text-white text-[12px]" style={{ boxShadow: "var(--shadow-pop)" }}>
      <p className="text-white/60 text-[11px] mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.value}
          {unit}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { facilities } = useDemo();

  const [metric, setMetric] = useState<Metric>("gaps");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [hoverFn, setHoverFn] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const [rankSort, setRankSort] = useState<"desc" | "asc">("desc");
  const [hoverRank, setHoverRank] = useState<string | null>(null);

  // table state
  const [stageFilter, setStageFilter] = useState<"all" | "pending" | Stage>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: "updated_at" | "closure_date" | "affected_pop"; dir: 1 | -1 }>({ key: "updated_at", dir: -1 });
  const [page, setPage] = useState(0);
  const PER = 5;

  const closing = facilities.filter((f) => f.status === "CLOSING").length;
  const pending = facilities.filter((f) => f.stage !== "reviewed").length;
  const pop = facilities.filter((f) => f.status !== "ACTIVE").reduce((a, f) => a + f.affected_pop, 0);
  const reviewed = facilities.filter((f) => f.stage === "reviewed").length;

  const stageCounts = (Object.keys(STAGE_LABEL) as Stage[]).map((s) => ({
    key: s,
    value: facilities.filter((f) => f.stage === s).length,
    color: STAGE_COLORS[s],
    label: STAGE_LABEL[s],
  }));

  const rows = useMemo(() => {
    const s = q.trim();
    return facilities
      .filter((f) => (stageFilter === "all" ? true : stageFilter === "pending" ? f.stage !== "reviewed" : f.stage === stageFilter))
      .filter((f) => !s || `${f.name}${f.eup_myeon}${f.ri}${f.biz_type}`.includes(s))
      .sort((a, b) => {
        const av = a[sort.key] ?? "", bv = b[sort.key] ?? "";
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
  }, [facilities, stageFilter, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const pageRows = rows.slice(page * PER, page * PER + PER);

  const ranking = [...EUP_MYEON_GAP].sort((a, b) => (rankSort === "desc" ? b.score - a.score : a.score - b.score)).slice(0, 8);

  const toggleSort = (key: typeof sort.key) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
    setPage(0);
  };

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div>
      <VillageMap />

      {/* KPI */}
      <div className="grid grid-cols-4 gap-5 mb-5 stagger">
        <StatCard icon={Store} label="폐업 예정 시설" value={closing} suffix="곳" delta={+2} deltaGood="down" color="#E8957A" trend={MONTHLY.map((m) => m.closures)} onClick={() => setStageFilter("all")} />
        <StatCard icon={ClipboardCheck} label="검토 대기" value={pending} suffix="건" delta={+1} deltaGood="down" color="#6FA8D0" trend={[5, 6, 6, 7, 6, 8, 7, 9, 8, 8, 9, pending]} active={stageFilter === "pending"} onClick={() => { setStageFilter("pending"); setPage(0); }} />
        <StatCard icon={Users} label="영향 인구 (추정)" value={pop} suffix="명" delta={-48} deltaGood="down" color="#D4B24C" trend={[2600, 2500, 2480, 2550, 2400, 2380, 2300, 2350, 2280, 2240, 2290, pop]} />
        <StatCard icon={CheckCircle2} label="상속안 검토 완료" value={reviewed} suffix="건" delta={+1} color="#6CBF8E" trend={MONTHLY.map((m) => m.resolved)} active={stageFilter === "reviewed"} onClick={() => { setStageFilter("reviewed"); setPage(0); }} />
      </div>

      {/* Function gap donuts */}
      <div className="grid grid-cols-4 gap-5 mb-5 stagger">
        {FUNCTIONS.map((f) => {
          const v = FUNCTION_GAP_RATE[f.code];
          const active = hoverFn === f.code;
          return (
            <button
              key={f.code}
              onMouseEnter={() => setHoverFn(f.code)}
              onMouseLeave={() => setHoverFn(null)}
              onClick={() => navigate(`/spatial?fn=${f.code}`)}
              className="card card-hover p-6 text-left group"
            >
              <div className="flex items-start justify-between">
                <FunctionIcon code={f.code} size={44} />
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-ink" style={{ background: f.hex }}>{f.code}</span>
              </div>
              <h3 className="text-[17px] font-bold text-text-primary mt-3 whitespace-nowrap">{f.name}</h3>
              <p className="text-[12px] text-text-muted">공백 법정리 비율</p>
              <div className="flex items-center justify-center my-4">
                <Donut
                  size={150}
                  thickness={active ? 30 : 26}
                  slices={[{ key: "gap", value: v, color: f.hex }, { key: "ok", value: 100 - v, color: "#F0F4EE" }]}
                  center={
                    <div>
                      <p className="text-[30px] font-extrabold leading-none tracking-tight text-text-primary">
                        <AnimatedNumber value={v} suffix="%" />
                      </p>
                      <p className={`text-[11px] text-text-muted mt-1 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}>
                        131개 리 중 {Math.round((131 * v) / 100)}곳
                      </p>
                    </div>
                  }
                />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-text-primary underline underline-offset-4 decoration-sage decoration-[3px]">지도에서 보기</span>
                <ArrowUpRight className="w-4 h-4 text-action group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-12 gap-5 mb-5 stagger">
        <div className="card p-6 col-span-7">
          <CardHeader
            title="월별 공백 추이"
            sub="최근 12개월 · 법정리 기준"
            right={
              <>
                <Dropdown
                  value={metric}
                  onChange={setMetric}
                  align="right"
                  options={(Object.keys(METRIC_LABEL) as Metric[]).map((k) => ({ value: k, label: METRIC_LABEL[k] }))}
                />
                <Segmented
                  size="sm"
                  value={chartType}
                  onChange={setChartType}
                  options={[{ value: "area", label: "선" }, { value: "bar", label: "막대" }]}
                />
              </>
            }
          />
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-[28px] font-bold tracking-tight">
              <AnimatedNumber value={MONTHLY[MONTHLY.length - 1][metric]} />
            </p>
            <p className="text-[12px] text-text-muted">이번 달 {METRIC_LABEL[metric]}</p>
          </div>
          <div className="h-[240px] -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={MONTHLY} key={`a-${metric}`}>
                  <defs>
                    <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A3D9B8" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#A3D9B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E3EBE0" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#8E978C" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#8E978C" }} width={36} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "#5FAF82", strokeDasharray: "4 4" }} />
                  <Area type="stepAfter" dataKey={metric} name={METRIC_LABEL[metric]} stroke="#5FAF82" strokeWidth={2.5} fill="url(#gArea)" activeDot={{ r: 5, strokeWidth: 3, stroke: "#fff" }} animationDuration={900} />
                </AreaChart>
              ) : (
                <ComposedChart data={MONTHLY} key={`b-${metric}`}>
                  <CartesianGrid vertical={false} stroke="#E3EBE0" />
                  <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#8E978C" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#8E978C" }} width={36} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "#2F5E430d" }} />
                  <Bar dataKey={metric} name={METRIC_LABEL[metric]} fill="#7BB58A" radius={[8, 8, 3, 3]} barSize={18} animationDuration={700} />
                  <Line dataKey={metric} name="추세" stroke="#5FAF82" strokeWidth={0} dot={false} legendType="none" />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6 col-span-5">
          <CardHeader
            title="읍·면별 공백 지수"
            sub="4개 기능 평균 · 높을수록 공백 심각"
            right={
              <button onClick={() => setRankSort((s) => (s === "desc" ? "asc" : "desc"))} className="btn btn-ghost btn-sm">
                <ArrowUpDown className="w-3.5 h-3.5" /> {rankSort === "desc" ? "높은 순" : "낮은 순"}
              </button>
            }
          />
          <div className="space-y-2.5 mt-2">
            {ranking.map((r, i) => {
              const dim = hoverRank && hoverRank !== r.name;
              const color = r.score >= 70 ? "#EE9A80" : r.score >= 55 ? "#F5BBA2" : r.score >= 40 ? "#F3DA86" : "#CDE8D4";
              return (
                <div
                  key={r.name}
                  onMouseEnter={() => setHoverRank(r.name)}
                  onMouseLeave={() => setHoverRank(null)}
                  onClick={() => navigate("/spatial")}
                  className={`flex items-center gap-3 cursor-pointer transition-opacity ${dim ? "opacity-40" : ""}`}
                >
                  <span className="w-4 text-[11px] font-bold text-text-muted tnum">{i + 1}</span>
                  <span className="w-[52px] text-[12.5px] font-semibold">{r.name}</span>
                  <div className="flex-1 h-6 bg-surface-secondary rounded-lg overflow-hidden relative">
                    <div
                      key={rankSort}
                      className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]"
                      style={{ width: `${r.score}%`, background: color, animation: "grow .8s cubic-bezier(.2,.7,.2,1) both", animationDelay: `${i * 40}ms`, transformOrigin: "left" }}
                    >
                      <span className="text-[11px] font-bold text-ink/80 tnum">{r.score}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <style>{`@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
        </div>
      </div>

      {/* Table + stage donut */}
      <div className="grid grid-cols-12 gap-5 stagger">
        <div className="card p-6 col-span-8">
          <CardHeader
            title="최근 등록 시설"
            sub={`${rows.length}개 시설`}
            right={
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(0); }}
                  placeholder="시설명·법정리 검색"
                  className="field !h-8 !text-[12px] !pl-8 !w-[200px] !rounded-[9px]"
                />
              </div>
            }
          />
          <div className="mb-3">
            <Segmented
              size="sm"
              value={stageFilter}
              onChange={(v) => { setStageFilter(v); setPage(0); }}
              options={[
                { value: "all", label: `전체 ${facilities.length}` },
                { value: "pending", label: `검토 대기 ${pending}` },
                ...(Object.keys(STAGE_LABEL) as Stage[]).map((s) => ({
                  value: s,
                  label: `${STAGE_LABEL[s]} ${facilities.filter((f) => f.stage === s).length}`,
                })),
              ]}
            />
          </div>
          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-tint text-action">
                  <th className="text-left font-bold py-3 px-4">시설</th>
                  <th className="text-left font-bold py-3 px-3">법정리</th>
                  <th className="text-left font-bold py-3 px-3">기능</th>
                  <th className="text-left font-bold py-3 px-3 cursor-pointer select-none hover:text-brand" onClick={() => toggleSort("closure_date")}>
                    <span className="inline-flex items-center gap-1">폐업 예정일 <ArrowUpDown className={`w-3 h-3 ${sort.key === "closure_date" ? "text-brand" : "text-text-muted"}`} /></span>
                  </th>
                  <th className="text-right font-bold py-3 px-3 cursor-pointer select-none hover:text-brand" onClick={() => toggleSort("affected_pop")}>
                    <span className="inline-flex items-center gap-1">영향 인구 <ArrowUpDown className={`w-3 h-3 ${sort.key === "affected_pop" ? "text-brand" : "text-text-muted"}`} /></span>
                  </th>
                  <th className="text-left font-bold py-3 px-4">진행 단계</th>
                </tr>
              </thead>
              <tbody key={`${stageFilter}-${page}-${q}-${sort.key}-${sort.dir}`} className="stagger">
                {pageRows.map((f) => {
                  const d = f.closure_date ? daysLeft(f.closure_date) : null;
                  const st = FACILITY_STATUS_BADGE[f.status];
                  return (
                    <tr
                      key={f.entity_id}
                      onClick={() => navigate(`/closures/${f.entity_id}/functions`)}
                      className={`border-t border-border cursor-pointer transition-colors hover:bg-surface-tint group ${hoverStage && hoverStage !== f.stage ? "opacity-40" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold group-hover:text-action transition-colors">{f.name}</p>
                        <p className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
                          {f.biz_type} · <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                        </p>
                      </td>
                      <td className="py-3 px-3 text-text-secondary">{f.eup_myeon} {f.ri}</td>
                      <td className="py-3 px-3">
                        <div className="flex -space-x-1">
                          {f.functions.map((c) => (
                            <span key={c} title={FN[c].name} className="w-6 h-6 rounded-full ring-2 ring-white text-[9px] font-bold text-ink flex items-center justify-center hover:-translate-y-0.5 hover:z-10 transition-transform" style={{ background: FN[c].hex }}>
                              {c.slice(1)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 tnum">
                        <p className="text-text-secondary">{f.closure_date?.replace(/-/g, ".") ?? "미정"}</p>
                        <p className={`text-[11px] font-semibold ${d === null ? "text-text-muted" : d < 0 ? "text-text-muted" : d <= 45 ? "text-status-error" : "text-text-muted"}`}>
                          {d === null ? "–" : d < 0 ? "폐업됨" : `D-${d}`}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold tnum">{f.affected_pop.toLocaleString()}명</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: STAGE_COLORS[f.stage] }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: STAGE_COLORS[f.stage] }} />
                          {STAGE_LABEL[f.stage]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[13px] text-text-muted">조건에 맞는 시설이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center disabled:opacity-40 hover:bg-brand-soft transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full text-[12px] font-bold transition-all ${i === page ? "bg-action text-white scale-105" : "bg-surface-secondary text-action hover:bg-brand-soft"}`}>
                {i + 1}
              </button>
            ))}
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-full bg-action text-white flex items-center justify-center disabled:opacity-40 disabled:bg-surface-secondary disabled:text-text-primary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="card p-6 col-span-4">
          <CardHeader title="상속 진행 현황" sub="단계 위에 마우스를 올리면 표에서 강조됩니다" />
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
                    {hoverStage ? stageCounts.find((s) => s.key === hoverStage)?.value : facilities.length}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">{hoverStage ? STAGE_LABEL[hoverStage as Stage] : "전체 시설"}</p>
                </div>
              }
            />
          </div>
          <div className="space-y-1 mt-4">
            {stageCounts.map((s) => (
              <button
                key={s.key}
                onMouseEnter={() => setHoverStage(s.key)}
                onMouseLeave={() => setHoverStage(null)}
                onClick={() => { setStageFilter(s.key); setPage(0); }}
                className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[12.5px] transition-colors ${hoverStage === s.key ? "bg-surface-secondary" : ""}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-left font-medium text-text-secondary">{s.label}</span>
                <span className="font-bold tnum">{s.value}</span>
                <span className="w-10 text-right text-text-muted tnum">{Math.round((s.value / facilities.length) * 100)}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
