import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, ArrowLeft, Check, MapPin, Ban, Undo2, Crown, Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import PageHeader, { DemoTag } from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import Dropdown from "../components/ui/Dropdown";
import StatusBadge from "../components/ui/StatusBadge";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { useDemo } from "../store/DemoStore";
import { useToast } from "../components/ui/Toast";
import { FacilityStrip } from "./FunctionAnalysis";
import {
  API_BASE, FUNCTIONS, FN, RESOURCE_TYPES, SCORE_FACTORS,
  type FnCode, type ScoreBreakdown, type InheritancePlan, type InheritanceResponse,
} from "../data/constants";

// ── 컴포넌트 ──
type SortKey = "score" | "distance";

export default function Inheritance() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { picks, setPick, excluded, toggleExcluded } = useDemo();
  const [tab, setTab] = useState<FnCode>("F01");
  const [sort, setSort] = useState<SortKey>("score");
  const [showExcluded, setShowExcluded] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);

  const [plans, setPlans] = useState<InheritancePlan[]>([]);
  const [uncoveredFns, setUncoveredFns] = useState<FnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setApiError(null);
    // TODO: POST /closures 등록 흐름 완성되면 실제 closure_id 사용
    const closureId = id === "store_0001" ? "closure_0001" : id;
    fetch(`${API_BASE}/closures/${closureId}/inheritance`)
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<InheritanceResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setPlans(data.plans);
        setUncoveredFns(data.uncovered_functions);
      })
      .catch((err) => {
        if (cancelled) return;
        setApiError(err.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // plan → 리스트용 정렬
  const list = useMemo(() => {
    return plans
      .filter((p) => p.function_code === tab)
      .filter((p) => showExcluded || !excluded.has(p.resource_id))
      .sort((a, b) => sort === "score" ? b.score - a.score : a.score_breakdown.distance - b.score_breakdown.distance);
  }, [plans, tab, sort, showExcluded, excluded]);

  useEffect(() => {
    setFocusId(picks[tab] ?? list[0]?.resource_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, list.length]);

  const focus = list.find((p) => p.resource_id === focusId) ?? list[0];
  const best = [...plans.filter((p) => p.function_code === tab && !excluded.has(p.resource_id))].sort((a, b) => b.score - a.score)[0];
  const compare = best && focus && best.resource_id !== focus.resource_id ? best : null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if ((e.key === "Enter" || e.key === " ") && t.closest("button, a, select, [role='button']")) return;
      const i = list.findIndex((p) => p.resource_id === focus?.resource_id);
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setFocusId(list[Math.min(list.length - 1, i + 1)]?.resource_id ?? null); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setFocusId(list[Math.max(0, i - 1)]?.resource_id ?? null); }
      if (e.key === "Enter" && focus) choose(focus.resource_id);
      if (["1", "2", "3", "4"].includes(e.key)) setTab(FUNCTIONS[+e.key - 1].code);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const choose = (resId: string) => {
    if (excluded.has(resId)) return;
    const p = plans.find((x) => x.resource_id === resId && x.function_code === tab)!;
    const already = picks[tab] === resId;
    setPick(tab, already ? null : resId);
    toast(already ? { kind: "info", title: "상속안 선택을 해제했습니다" } : { title: `${tab} 상속안 지정`, desc: `${p.resource_name}이(가) ${FN[tab].name} 기능을 이어받습니다.` });
  };

  const toPercent = (v: number) => Math.round(v * 100);
  const totalPercent = (p: InheritancePlan) => toPercent(p.score);

  const radarData = SCORE_FACTORS.map((f) => ({
    factor: f.label,
    focus: focus ? toPercent(focus.score_breakdown[f.key]) : 0,
    best: compare ? toPercent(compare.score_breakdown[f.key]) : 0,
  }));

  const color = FN[tab].hex;
  const pickedCount = FUNCTIONS.filter((f) => picks[f.code]).length;

  return (
    <div>
      <PageHeader
        en="Inheritance Plan"
        eyebrow={<FlowStepper />}
        title="기능별 상속안 제안"
        badge={<DemoTag />}
        desc="각 기능을 이어받을 수 있는 지역 자원을 비교하고, 담당자가 상속 자원을 지정합니다."
        actions={
          <>
            <button onClick={() => navigate("/spatial")} className="btn btn-ghost">공간 분석에서 보기</button>
            <button onClick={() => navigate(`/closures/${id}/review`)} className="btn btn-primary group">
              최종 검토 ({pickedCount}/4) <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        }
      />

      <FacilityStrip />

      {/* function tabs */}
      <div className="grid grid-cols-4 gap-3 mb-6 stagger">
        {FUNCTIONS.map((f, i) => {
          const on = tab === f.code;
          const picked = plans.find((p) => p.resource_id === picks[f.code] && p.function_code === f.code);
          const uncovered = uncoveredFns.includes(f.code);
          return (
            <button
              key={f.code}
              onClick={() => setTab(f.code)}
              className={`relative card p-4 text-left transition-all overflow-hidden ${on ? "!border-transparent -translate-y-0.5" : "card-hover"} ${uncovered ? "!border-status-error/40" : ""}`}
              style={on ? { boxShadow: `inset 0 0 0 2px ${f.hex}, var(--shadow-lift)` } : undefined}
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 transition-all" style={{ background: f.hex, opacity: on ? 1 : 0.25 }} />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold" style={{ color: f.deep }}>{f.code}</span>
                <span className="text-[13.5px] font-bold">{f.name}</span>
                <span className="kbd ml-auto">{i + 1}</span>
              </div>
              <p className={`text-[12px] mt-1.5 flex items-center gap-1.5 ${picked ? "text-status-ok font-semibold" : uncovered ? "text-status-error font-semibold" : "text-text-muted"}`}>
                {picked ? <><Check className="w-3.5 h-3.5" strokeWidth={3} /> {picked.resource_name}</> : uncovered ? <><AlertTriangle className="w-3.5 h-3.5" /> 대체 불가</> : "상속 자원 미지정"}
              </p>
            </button>
          );
        })}
      </div>

      {/* 상태 배너 */}
      {loading && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-xl bg-surface-tint border border-border text-[13px] text-text-secondary animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin" /> 상속 후보를 불러오는 중...
        </div>
      )}
      {apiError && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-xl bg-[#FBF1E4] border border-[#E8D5B7] text-[13px] text-status-warn animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          API 연결 실패: {apiError}
        </div>
      )}
      {uncoveredFns.length > 0 && !loading && (
        <div className="flex items-start gap-2 mb-4 p-4 rounded-xl bg-[#FDECEC] border border-[#E8C5C5] text-[13px] text-status-error animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">대체 불가 기능 경고</p>
            <p className="mt-0.5">
              {uncoveredFns.map((fn, i) => (
                <span key={fn}>{i > 0 && ", "}<span className="font-bold" style={{ color: FN[fn].hex }}>{FN[fn].name}({fn})</span></span>
              ))}
              {" "}기능은 현재 대체 가능한 자원이 없습니다. 담당자 확인이 필요합니다.
            </p>
          </div>
        </div>
      )}

      {!loading && !apiError && (
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* list */}
          <div className="col-span-7 card p-5 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] font-bold text-action">상속 후보 자원</h2>
                <p className="text-[12px] text-text-muted mt-0.5"><span className="kbd">J</span> <span className="kbd">K</span> 이동 · <span className="kbd">↵</span> 지정</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowExcluded((s) => !s)} className="btn btn-ghost btn-sm">
                  {showExcluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} 제외 후보
                </button>
                <Dropdown value={sort} onChange={setSort} align="right" options={[{ value: "score", label: "추천 점수순" }, { value: "distance", label: "거리순" }]} />
              </div>
            </div>

            <div key={`${tab}-${sort}`} className="space-y-2 stagger">
              {list.map((p, i) => {
                const s = totalPercent(p);
                const isFocus = focus?.resource_id === p.resource_id;
                const isPick = picks[tab] === p.resource_id;
                const isEx = excluded.has(p.resource_id);
                return (
                  <div
                    key={p.resource_id}
                    onClick={() => setFocusId(p.resource_id)}
                    onDoubleClick={() => choose(p.resource_id)}
                    className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                      isFocus ? "bg-surface-tint" : "border-border hover:border-border-strong hover:bg-surface-tint/60"
                    } ${isEx ? "opacity-45" : ""}`}
                    style={isFocus ? { borderColor: color, boxShadow: `0 0 0 3px ${color}1a` } : undefined}
                  >
                    <div className="w-9 text-center">
                      {i === 0 && sort === "score" && !isEx ? (
                        <Crown className="w-5 h-5 mx-auto text-[#D9A12B]" />
                      ) : (
                        <span className="text-[13px] font-bold text-text-muted tnum">{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[14px] font-bold truncate ${isEx ? "line-through" : ""}`}>{p.resource_name}</p>
                        {isPick && <StatusBadge variant="confirmed" dot>지정됨</StatusBadge>}
                        {isEx && <StatusBadge variant="error">제외</StatusBadge>}
                        {p.needs_officer_check && !isPick && <StatusBadge variant="review">확인 필요</StatusBadge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[12px] text-text-muted">
                        <span className="px-1.5 py-0.5 rounded-md bg-surface-secondary font-semibold text-text-secondary">{p.resource_type} {RESOURCE_TYPES[p.resource_type]}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{toPercent(p.score_breakdown.distance)}점</span>
                      </div>
                    </div>
                    <div className="w-[120px]">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-text-muted">추천 점수</span>
                        <span className="font-bold tnum" style={{ color }}>{s}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s}%`, background: color, animation: "grow .8s cubic-bezier(.2,.7,.2,1) both", transformOrigin: "left" }} />
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); choose(p.resource_id); }}
                      disabled={isEx}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isPick ? "border-transparent scale-105" : "border-border-strong text-transparent hover:text-text-muted hover:border-text-muted"}`}
                      style={isPick ? { background: color, color: FN[tab].deep } : undefined}
                      title="이 자원으로 상속"
                    >
                      <Check className={`w-4 h-4 ${isPick ? "animate-pop" : ""}`} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
              {list.length === 0 && (
                <p className="text-center py-12 text-[13px] text-text-muted">
                  {uncoveredFns.includes(tab) ? "이 기능은 대체 가능한 자원이 없습니다." : "표시할 후보가 없습니다."}
                </p>
              )}
            </div>
            <style>{`@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
          </div>

          {/* detail */}
          {focus && (
            <aside key={focus.resource_id} className="col-span-5 card p-6 sticky top-4 animate-fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold" style={{ color }}>{focus.resource_type} · {RESOURCE_TYPES[focus.resource_type]}</p>
                  <h3 className="text-[19px] font-bold mt-0.5">{focus.resource_name}</h3>
                  <p className="text-[12.5px] text-text-muted mt-1">{focus.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-[34px] font-bold leading-none tracking-tight" style={{ color }}>
                    <AnimatedNumber value={totalPercent(focus)} duration={600} />
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">종합 점수</p>
                </div>
              </div>

              {/* 추천 사유 */}
              <div className="mt-4 p-3 rounded-xl bg-surface-tint border border-border text-[12.5px] text-text-secondary">
                <p className="text-[11px] font-bold text-text-muted mb-1">추천 사유</p>
                {focus.reason}
              </div>

              <div className="h-[230px] -mx-2 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#E4EAEF" />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11.5, fill: "#4E5A4E", fontWeight: 600 }} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="px-3 py-2 rounded-xl bg-[#1C1C1C] text-white text-[12px]">
                            <p className="text-white/60 text-[11px]">{label}</p>
                            {payload.map((pp) => <p key={String(pp.name)} className="font-semibold">{pp.name}: {pp.value}</p>)}
                          </div>
                        ) : null
                      }
                    />
                    {compare && <Radar name="1순위 후보" dataKey="best" stroke="#8E978C" strokeDasharray="4 3" fill="#8E978C" fillOpacity={0.08} />}
                    <Radar name={focus.resource_name} dataKey="focus" stroke={color} strokeWidth={2.5} fill={color} fillOpacity={0.22} animationDuration={700} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {compare && (
                <p className="text-[11.5px] text-text-muted -mt-1 mb-3 flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-text-muted" /> 1순위 후보 ({compare.resource_name})와 비교
                </p>
              )}

              <div className="space-y-2.5">
                {SCORE_FACTORS.map((f) => {
                  const v = toPercent(focus.score_breakdown[f.key]);
                  const diff = compare ? v - toPercent(compare.score_breakdown[f.key]) : 0;
                  return (
                    <div key={f.key} className="flex items-center gap-3 group">
                      <span className="text-[12px] text-text-secondary w-[78px]">{f.label}</span>
                      <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${v}%`, background: color }} />
                      </div>
                      <span className="text-[12px] font-bold w-7 text-right tnum">{v}</span>
                      {compare && (
                        <span className={`text-[10.5px] font-bold w-8 text-right tnum ${diff > 0 ? "text-status-ok" : diff < 0 ? "text-status-error" : "text-text-muted"}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    toggleExcluded(focus.resource_id);
                    if (picks[tab] === focus.resource_id) setPick(tab, null);
                    toast({ kind: "info", title: excluded.has(focus.resource_id) ? "후보 제외를 취소했습니다" : `${focus.resource_name} 후보 제외` });
                  }}
                  className="btn btn-ghost flex-1"
                >
                  {excluded.has(focus.resource_id) ? <><Undo2 className="w-4 h-4" /> 제외 취소</> : <><Ban className="w-4 h-4" /> 후보 제외</>}
                </button>
                <button onClick={() => choose(focus.resource_id)} disabled={excluded.has(focus.resource_id)} className="btn flex-[2]" style={picks[tab] === focus.resource_id ? { background: "#2E8466", color: "#fff" } : { background: color, color: FN[tab].deep }}>
                  {picks[tab] === focus.resource_id ? <><Check className="w-4 h-4" strokeWidth={3} /> 상속 자원으로 지정됨</> : "이 자원으로 상속"}
                </button>
              </div>
            </aside>
          )}
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={() => navigate(`/closures/${id}/functions`)} className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> 기능 분석으로</button>
      </div>
    </div>
  );
}
