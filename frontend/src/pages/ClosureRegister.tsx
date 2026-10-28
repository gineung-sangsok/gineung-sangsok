import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, MapPin, Store, CalendarClock, AlertCircle, ArrowRight, Search } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import StatusBadge from "../components/ui/StatusBadge";
import { API_BASE, type ApiEntity } from "../data/constants";
import { useToast } from "../components/ui/Toast";

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[13px] font-semibold">
          {label} {required && <span className="text-status-error">*</span>}
        </label>
        {hint && !error && <span className="text-[11.5px] text-text-muted">{hint}</span>}
        {error && (
          <span className="text-[11.5px] text-status-error font-semibold inline-flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-3 h-3" /> {error}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ClosureRegister() {
  const navigate = useNavigate();
  const toast = useToast();

  const [stores, setStores] = useState<ApiEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiEntity | null>(null);
  const [query, setQuery] = useState("");
  const [closureDate, setClosureDate] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/stores`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: ApiEntity[]) => setStores(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = query.trim()
    ? stores.filter((s) => `${s.name} ${s.village_id} ${s.entity_id}`.toLowerCase().includes(query.trim().toLowerCase()))
    : stores;

  const setDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setClosureDate(localDateString(d));
    setErrors((e) => ({ ...e, closure_date: "" }));
  };

  const dday = closureDate ? Math.ceil((new Date(closureDate).getTime() - Date.now()) / 86400000) : null;

  const completeness = [selected, closureDate].filter(Boolean).length / 2;

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!selected) e.store = "시설을 선택하세요";
    if (!closureDate) e.closure_date = "날짜를 선택하세요";
    setErrors(e);
    if (Object.keys(e).length) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setSubmitting(true);
    fetch(`${API_BASE}/closures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: selected!.entity_id,
        closure_date: closureDate || undefined,
        note: memo || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
      })
      .then((data: { closure_id: string; store: { name: string } }) => {
        toast({ title: `${data.store.name} 등록 완료`, desc: "기능 공백 분석을 시작합니다." });
        navigate(`/closures/${data.closure_id}/functions`);
      })
      .catch(() => {
        toast({ kind: "warn", title: "등록 실패", desc: "API 연결을 확인해 주세요." });
        setSubmitting(false);
      });
  };

  return (
    <div>
      <PageHeader
        en="Register"
        eyebrow={<FlowStepper />}
        title="폐업 예정 시설 등록"
        desc="폐업 예정 시설을 선택하고 폐업일을 등록하면 해당 시설이 제공하던 생활 기능을 자동으로 분석합니다."
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Form */}
        <div className={`col-span-8 space-y-5 stagger ${shake ? "animate-shake" : ""}`}>
          {/* 시설 선택 */}
          <section className="card p-6 space-y-5">
            <h2 className="text-[15px] font-bold text-action flex items-center gap-2"><Store className="w-4 h-4" /> 시설 선택</h2>
            {errors.store && (
              <p className="text-[12px] text-status-error font-semibold flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-3 h-3" /> {errors.store}
              </p>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="시설명 또는 ID로 검색..."
                className="field !pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-[13px] text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> 시설 목록을 불러오는 중...
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-[13px] text-text-muted">
                {stores.length === 0 ? "등록된 시설이 없습니다." : `"${query}"에 해당하는 시설이 없습니다.`}
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto thin-scroll">
                {filtered.map((s) => {
                  const on = selected?.entity_id === s.entity_id;
                  return (
                    <button
                      key={s.entity_id}
                      onClick={() => { setSelected(s); setErrors((e) => ({ ...e, store: "" })); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                        on ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-border hover:border-border-strong hover:bg-surface-tint"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-sidebar text-white text-[14px] font-bold flex items-center justify-center shrink-0">
                        {s.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold truncate">{s.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[12px] text-text-muted">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.village_id}</span>
                          <StatusBadge variant={s.status === "CLOSING" ? "closing" : s.status === "ACTIVE" ? "confirmed" : "muted"}>{s.status}</StatusBadge>
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        on ? "bg-brand border-brand text-white" : "border-border-strong text-transparent"
                      }`}>
                        <Check className={`w-3.5 h-3.5 ${on ? "animate-pop" : ""}`} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 일정 */}
          <section className="card p-6 space-y-5">
            <h2 className="text-[15px] font-bold text-action flex items-center gap-2"><CalendarClock className="w-4 h-4" /> 폐업 일정</h2>
            <Field label="폐업 예정일" required error={errors.closure_date}>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={closureDate}
                  onChange={(e) => { setClosureDate(e.target.value); setErrors((er) => ({ ...er, closure_date: "" })); }}
                  className={`field flex-1 ${errors.closure_date ? "!border-status-error" : ""}`}
                />
                {[30, 60, 90].map((d) => (
                  <button key={d} onClick={() => setDateOffset(d)} className="btn btn-ghost !h-11">+{d}일</button>
                ))}
              </div>
            </Field>
            <Field label="메모" hint={`${memo.length}/300`}>
              <textarea maxLength={300} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="참고 사항이 있으면 입력하세요." rows={3} className="field resize-none" />
            </Field>
          </section>
        </div>

        {/* Live preview */}
        <aside className="col-span-4 sticky top-4 space-y-4 animate-fade-up" style={{ animationDelay: ".15s" }}>
          <div className="card overflow-hidden">
            <div className="h-24 relative bg-sidebar" style={{ backgroundImage: "radial-gradient(80% 120% at 100% 0%, #4F8A68 0%, transparent 60%)" }}>
              <span className="absolute left-5 bottom-3 text-[11px] font-bold text-white/60 tracking-widest">미리보기</span>
              {dday !== null && (
                <span key={dday} className="absolute right-4 top-4 px-2.5 py-1 rounded-lg bg-white/15 text-white text-[13px] font-bold animate-pop tnum">
                  D{dday >= 0 ? `-${dday}` : `+${-dday}`}
                </span>
              )}
            </div>
            <div className="p-5 -mt-8 relative">
              <div className="w-14 h-14 rounded-2xl bg-surface shadow-[var(--shadow-lift)] flex items-center justify-center mb-3">
                <Store className="w-6 h-6 text-action" />
              </div>
              <p className={`text-[19px] font-bold ${selected ? "" : "text-text-muted"}`}>{selected?.name ?? "시설 미선택"}</p>
              {selected && (
                <p className="text-[12px] text-text-muted mt-0.5">{selected.entity_id}</p>
              )}
              <div className="mt-4 space-y-2 text-[12.5px]">
                <p className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" /> {selected?.village_id ?? "위치 미지정"}
                </p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <CalendarClock className="w-3.5 h-3.5 text-text-muted" /> {closureDate ? closureDate.replace(/-/g, ".") : "폐업 예정일 미지정"}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-[12.5px] mb-2">
              <span className="font-semibold">입력 완성도</span>
              <span className="font-bold text-brand tnum">{Math.round(completeness * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-action transition-all duration-500" style={{ width: `${completeness * 100}%` }} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => navigate("/dashboard")} className="btn btn-ghost flex-1">취소</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary flex-[2] group">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 준비 중</> : <>등록 후 기능 분석 <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
