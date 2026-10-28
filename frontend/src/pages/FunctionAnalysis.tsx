import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, X, ChevronLeft, ChevronRight, Quote, FileText, MapPin, CalendarClock, Users, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import PageHeader, { DemoTag } from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import StatusBadge from "../components/ui/StatusBadge";
import Segmented from "../components/ui/Segmented";
import HouseFrame from "../components/ui/HouseFrame";
import FunctionCard, { confidenceLabel } from "../components/ui/FunctionCard";
import Donut from "../components/ui/Donut";
import { API_BASE, FN, TAGGING_SOURCE_LABEL, type FnCode, type FunctionTag } from "../data/constants";
import { useDemo, type Decision } from "../store/DemoStore";
import { useToast } from "../components/ui/Toast";

export function FacilityStrip() {
  const { id } = useParams();
  const { facilities } = useDemo();
  const f = facilities.find((x) => x.entity_id === id);
  if (!f) return <div className="card p-5 mb-6">시설을 찾을 수 없습니다.</div>;
  const d = f.closure_date ? Math.ceil((new Date(f.closure_date).getTime() - Date.now()) / 86400000) : null;
  const items = [
    { icon: MapPin, k: "법정리", v: `${f.eup_myeon} ${f.ri}` },
    { icon: CalendarClock, k: "폐업 예정일", v: f.closure_date?.replace(/-/g, ".") ?? "미정" },
    { icon: Users, k: "영향 인구 (추정)", v: `${f.affected_pop}명` },
  ];
  return (
    <div className="card p-5 mb-6 flex items-center gap-8 animate-fade-up">
      <div className="flex items-center gap-3 pr-8 border-r border-border">
        <div className="w-11 h-11 rounded-xl bg-sidebar text-white text-[16px] font-bold flex items-center justify-center">{f.name[0]}</div>
        <div>
          <p className="text-[16px] font-bold">{f.name}</p>
          <p className="text-[12px] text-text-muted">{f.biz_type}</p>
        </div>
      </div>
      {items.map(({ icon: Icon, k, v }) => (
        <div key={k} className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-text-muted" />
          <div>
            <p className="text-[11px] text-text-muted">{k}</p>
            <p className="text-[13.5px] font-semibold tnum">{v}</p>
          </div>
        </div>
      ))}
      <div className="ml-auto text-right">
        <p className="text-[11px] text-text-muted">폐업까지</p>
        <p className={`text-[22px] font-bold tnum ${d !== null && d <= 60 ? "text-status-error" : "text-action"}`}>{d !== null ? (d >= 0 ? `D-${d}` : `D+${Math.abs(d)}`) : "–"}</p>
      </div>
    </div>
  );
}

const DECISION_OPTS: { value: Decision; label: string; icon: typeof Check; cls: string; key: string }[] = [
  { value: "accepted", label: "기능 있음", icon: Check, cls: "bg-status-ok text-white border-status-ok", key: "A" },
  { value: "rejected", label: "해당 없음", icon: X, cls: "bg-status-error text-white border-status-error", key: "R" },
  { value: "pending", label: "보류", icon: RotateCcw, cls: "bg-text-secondary text-white border-text-secondary", key: "P" },
];

export default function FunctionAnalysis() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { fnDecisions, setFnDecision, fnNotes, setFnNote } = useDemo();
  const [selected, setSelected] = useState<FnCode | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  // API에서 기능 태깅 결과 가져오기
  const [functionResults, setFunctionResults] = useState<(FunctionTag & { quote?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setApiError(null);
    setFunctionResults([]);
    const closureId = id === "store_0001" ? "closure_0001" : id;
    fetch(`${API_BASE}/closures/${closureId}/functions`)
      .then((res) => { if (!res.ok) throw new Error(`API ${res.status}`); return res.json(); })
      .then((data: { functions: FunctionTag[] }) => {
        if (!cancelled) setFunctionResults(data.functions.map((f) => ({ ...f, quote: "" })));
      })
      .catch((err) => {
        if (!cancelled) setApiError(err instanceof Error ? err.message : "기능 분석 결과를 불러오지 못했습니다.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const order = functionResults.map((r) => r.code);
  const visible = functionResults.filter((r) =>
    filter === "all" ? true : filter === "pending" ? fnDecisions[r.code] === "pending" : fnDecisions[r.code] !== "pending",
  );
  const doneCount = order.filter((c) => fnDecisions[c] !== "pending").length;

  const decide = (code: FnCode, d: Decision) => {
    setFnDecision(code, d);
    if (d !== "pending") toast({ kind: d === "accepted" ? "ok" : "info", title: `${code} ${FN[code].name}`, desc: d === "accepted" ? "기능 있음으로 확인했습니다." : "해당 없음으로 처리했습니다." });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT") return;
      if (order.length > 0 && +e.key >= 1 && +e.key <= order.length) setSelected(order[+e.key - 1]);
      if (!selected || order.length === 0) return;
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") setSelected(order[(order.indexOf(selected) + 1) % order.length]);
      if (e.key === "ArrowLeft") setSelected(order[(order.indexOf(selected) + order.length - 1) % order.length]);
      if (e.key.toLowerCase() === "a") decide(selected, "accepted");
      if (e.key.toLowerCase() === "r") decide(selected, "rejected");
      if (e.key.toLowerCase() === "p") decide(selected, "pending");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const sel = selected ? functionResults.find((r) => r.code === selected) ?? null : null;

  return (
    <div>
      <PageHeader
        en="Function Analysis"
        eyebrow={<FlowStepper />}
        title="기능 공백 분석"
        badge={<><StatusBadge variant="closing" dot>CLOSING</StatusBadge><DemoTag /></>}
        desc="폐업으로 사라질 수 있는 생활 기능과 그 근거를 확인하고, 담당자가 최종 판단합니다."
        actions={
          <button onClick={() => navigate(`/closures/${id}/inheritance`)} className="btn btn-primary group">
            상속안 추천으로 이동 <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        }
      />

      <FacilityStrip />

      {loading && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-xl bg-surface-tint border border-border text-[13px] text-text-secondary animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin" /> 기능 분석 결과를 불러오는 중...
        </div>
      )}
      {apiError && (
        <div className="flex items-center gap-2 mb-4 p-4 rounded-xl bg-[#FBF1E4] border border-[#E8D5B7] text-[13px] text-status-warn animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          API 연결 실패: {apiError}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 animate-fade-up">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `전체 ${order.length}` },
            { value: "pending", label: `검토 대기 ${order.length - doneCount}` },
            { value: "done", label: `판단 완료 ${doneCount}` },
          ]}
        />
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-ink">
            <span className="kbd">1</span>–<span className="kbd">4</span> 열기 · <span className="kbd">A</span> 확인 · <span className="kbd">R</span> 제외
          </span>
          <div className="flex items-center gap-2">
            <div className="w-28 h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: order.length > 0 ? `${(doneCount / order.length) * 100}%` : "0%" }} />
            </div>
            <span className="text-[12px] font-bold tnum">{doneCount}/{order.length}</span>
          </div>
        </div>
      </div>

      <div key={filter} className="grid grid-cols-2 gap-5 stagger">
        {visible.map((f, i) => (
          <HouseFrame key={f.code} variant={i}>
          <FunctionCard
            code={f.code}
            index={order.indexOf(f.code)}
            confidence={f.confidence}
            evidence={f.evidence}
            source={TAGGING_SOURCE_LABEL[f.source]}
            decision={fnDecisions[f.code]}
            selected={selected === f.code}
            onClick={() => setSelected(f.code)}
          />
          </HouseFrame>
        ))}
        {visible.length === 0 && order.length > 0 && (
          <div className="col-span-2 card py-16 text-center text-[13px] text-text-muted">
            모든 기능 검토를 마쳤습니다 🎉
          </div>
        )}
      </div>

      {/* Confidence legend */}
      <div className="card p-5 mt-5 animate-fade-up">
        <p className="text-[12.5px] font-bold mb-3">신뢰도 판정 기준</p>
        <div className="relative h-3 rounded-full overflow-hidden flex">
          <div className="w-[40%] bg-surface-secondary" />
          <div className="w-[20%] bg-[#F5DDBA]" />
          <div className="w-[40%] bg-[#BFE3D3]" />
          {functionResults.map((r) => (
            <span key={r.code} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-2 ring-white" style={{ left: `calc(${(r.confidence ?? 0) * 100}% - 6px)`, background: FN[r.code].hex }} title={`${r.code} ${Math.round((r.confidence ?? 0) * 100)}%`} />
          ))}
        </div>
        <div className="flex text-[11px] text-text-muted mt-2">
          <span className="w-[40%]">0–39 · 태깅 제외</span>
          <span className="w-[20%]">40–59 · 확인 필요</span>
          <span className="w-[40%]">60+ · 태깅 후보</span>
        </div>
      </div>

      {/* Drawer */}
      {sel && (
        <div className="fixed inset-0 z-50" onMouseDown={() => setSelected(null)}>
          <div className="absolute inset-0 bg-[#0A2733]/25 animate-fade-in" />
          <aside
            key={sel.code}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-[460px] bg-surface flex flex-col animate-slide-in-right"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            <div className="h-1.5 shrink-0" style={{ background: FN[sel.code].hex }} />
            <div className="flex items-center justify-between px-6 h-16 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(order[(order.indexOf(sel.code) + order.length - 1) % order.length])} className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setSelected(order[(order.indexOf(sel.code) + 1) % order.length])} className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                <span className="text-[12px] text-text-muted tnum">{order.indexOf(sel.code) + 1} / {order.length}</span>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto thin-scroll p-6 space-y-6">
              <div className="flex items-center gap-5">
                <Donut
                  size={112}
                  thickness={13}
                  slices={[{ key: "c", value: Math.round((sel.confidence ?? 0) * 100), color: FN[sel.code].hex }, { key: "r", value: 100 - Math.round((sel.confidence ?? 0) * 100), color: "transparent" }]}
                  center={<p className="text-[24px] font-bold tnum">{Math.round((sel.confidence ?? 0) * 100)}<span className="text-[13px] text-text-muted">%</span></p>}
                />
                <div>
                  <p className="text-[12px] font-bold" style={{ color: FN[sel.code].deep }}>{sel.code}</p>
                  <h3 className="text-[21px] font-bold">{FN[sel.code].name}</h3>
                  <p className="text-[12.5px] text-text-muted">{FN[sel.code].desc}</p>
                  <div className="mt-2"><StatusBadge variant={confidenceLabel(sel.confidence).variant}>{confidenceLabel(sel.confidence).text}</StatusBadge></div>
                </div>
              </div>

              <div>
                <p className="text-[12px] font-bold text-text-muted mb-2">분석 근거</p>
                <p className="text-[14px] font-semibold">{sel.evidence}</p>
                <div className="mt-3 rounded-xl bg-surface-tint border border-border p-4 relative">
                  <Quote className="w-4 h-4 text-brand absolute -top-2 left-3 bg-surface-tint" />
                  <p className="text-[13px] text-text-secondary leading-relaxed">{sel.quote}</p>
                </div>
                <p className="text-[12px] text-text-muted mt-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 태깅 방법 · {TAGGING_SOURCE_LABEL[sel.source]}</p>
              </div>

              <div>
                <p className="text-[12px] font-bold text-text-muted mb-2">담당자 판단</p>
                <div className="grid grid-cols-3 gap-2">
                  {DECISION_OPTS.map((o) => {
                    const on = fnDecisions[sel.code] === o.value;
                    const Icon = o.icon;
                    return (
                      <button
                        key={o.value}
                        onClick={() => decide(sel.code, o.value)}
                        className={`h-12 rounded-xl border text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 ${on ? o.cls : "border-border hover:bg-surface-secondary text-text-secondary"}`}
                      >
                        <Icon className={`w-4 h-4 ${on ? "animate-pop" : ""}`} strokeWidth={2.6} /> {o.label}
                        <span className={`text-[10px] px-1 rounded ${on ? "bg-white/20" : "bg-surface-secondary"}`}>{o.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[12px] font-bold text-text-muted mb-2">수정 사유 / 메모</p>
                <textarea
                  value={fnNotes[sel.code]}
                  onChange={(e) => setFnNote(sel.code, e.target.value)}
                  placeholder="판단 근거나 현장 확인 내용을 남겨 주세요."
                  rows={4}
                  className="field resize-none"
                />
                {fnNotes[sel.code] && <p className="text-[11px] text-status-ok mt-1.5 animate-fade-in">자동 저장됨</p>}
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-2 shrink-0">
              <button onClick={() => setSelected(null)} className="btn btn-ghost flex-1">닫기</button>
              <button
                onClick={() => {
                  if (fnDecisions[sel.code] === "pending") decide(sel.code, "accepted");
                  const next = order.find((c) => c !== sel.code && fnDecisions[c] === "pending");
                  setSelected(next ?? null);
                }}
                className="btn btn-primary flex-[2]"
              >
                확인 후 다음 대기 항목 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
