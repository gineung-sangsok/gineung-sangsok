import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, MapPin, Store, CalendarClock, Link2, AlertCircle, ArrowRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import StatusBadge from "../components/ui/StatusBadge";
import { API_BASE } from "../data/constants";
import { useToast } from "../components/ui/Toast";

interface RiOpt { code: string; ri: string; eup: string; lat: number; lng: number }

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function centroid(coords: number[][][] | number[][][][]): [number, number] {
  const ring = (Array.isArray(coords[0][0][0]) ? (coords as number[][][][])[0][0] : (coords as number[][][])[0]) as number[][];
  let x = 0, y = 0;
  ring.forEach(([a, b]) => { x += a; y += b; });
  return [y / ring.length, x / ring.length];
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

  const [form, setForm] = useState({
    closure_date: "",
    address: "",
    memo: "",
  });
  const [ri, setRi] = useState<RiOpt | null>(null);
  const [riList, setRiList] = useState<RiOpt[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acIdx, setAcIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linking, setLinking] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/data/legal_ri_imsil.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((g) =>
        setRiList(
          g.features.map((f: { properties: { ri_code: string; ri_name: string; eup_myeon: string }; geometry: { coordinates: number[][][] } }) => {
            const [lat, lng] = centroid(f.geometry.coordinates);
            return { code: f.properties.ri_code, ri: f.properties.ri_name, eup: f.properties.eup_myeon, lat, lng };
          }),
        ),
      )
      .catch(() => setErrors((e) => ({ ...e, address: "법정리 데이터를 불러오지 못했습니다. 다시 시도해 주세요." })));
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const suggestions = useMemo(() => {
    const s = form.address.replace(/전북|임실군|\d+/g, "").trim();
    if (!s || ri) return [];
    const parts = s.split(/\s+/);
    return riList.filter((r) => parts.every((p) => `${r.eup} ${r.ri}`.includes(p))).slice(0, 6);
  }, [form.address, riList, ri]);

  const pickRi = (r: RiOpt) => {
    setAcOpen(false);
    setLinking(true);
    update("address", `전북 임실군 ${r.eup} ${r.ri} `);
    setTimeout(() => {
      setRi(r);
      setLinking(false);
    }, 700);
  };

  const setDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    update("closure_date", localDateString(d));
  };

  const dday = form.closure_date ? Math.ceil((new Date(form.closure_date).getTime() - Date.now()) / 86400000) : null;

  const completeness = [form.closure_date, ri].filter(Boolean).length / 2;

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!ri) e.address = "목록에서 법정리를 선택하세요";
    if (!form.closure_date) e.closure_date = "날짜를 선택하세요";
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
        store_id: ri!.code,
        closure_date: form.closure_date || undefined,
        note: form.memo || undefined,
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
        desc="시설이 위치한 법정리와 폐업 예정일을 등록하면 해당 시설이 제공하던 생활 기능을 자동으로 분석합니다."
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Form */}
        <div ref={formRef} className={`col-span-8 space-y-5 stagger ${shake ? "animate-shake" : ""}`}>
          <section className="card p-6 space-y-5">
            <h2 className="text-[15px] font-bold text-action flex items-center gap-2"><CalendarClock className="w-4 h-4" /> 일정 · 위치</h2>
            <Field label="폐업 예정일" required error={errors.closure_date}>
              <div className="flex gap-2">
                <input type="date" value={form.closure_date} onChange={(e) => update("closure_date", e.target.value)} className={`field flex-1 ${errors.closure_date ? "!border-status-error" : ""}`} />
                {[30, 60, 90].map((d) => (
                  <button key={d} onClick={() => setDateOffset(d)} className="btn btn-ghost !h-11">+{d}일</button>
                ))}
              </div>
            </Field>

            <Field label="주소 (법정리)" required error={errors.address} hint="면·리 이름을 입력하면 자동완성됩니다">
              <div className="relative">
                <MapPin className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => {
                    update("address", e.target.value);
                    setRi(null);
                    setAcOpen(true);
                    setAcIdx(0);
                  }}
                  onFocus={() => setAcOpen(true)}
                  onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (!suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setAcIdx((i) => Math.min(suggestions.length - 1, i + 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setAcIdx((i) => Math.max(0, i - 1)); }
                    if (e.key === "Enter") { e.preventDefault(); pickRi(suggestions[acIdx]); }
                  }}
                  placeholder="예: 삼계면 죽계리"
                  className={`field !pl-10 ${errors.address ? "!border-status-error" : ""}`}
                />
                {ri && <Check className="w-4 h-4 text-status-ok absolute right-3.5 top-1/2 -translate-y-1/2 animate-pop" strokeWidth={3} />}
                {acOpen && suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl p-1 animate-scale-in" style={{ boxShadow: "var(--shadow-pop)" }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={s.code}
                        onMouseDown={(e) => { e.preventDefault(); pickRi(s); }}
                        onMouseMove={() => setAcIdx(i)}
                        className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-left text-[13px] ${i === acIdx ? "bg-brand-soft" : ""}`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-brand" />
                        <span className="font-semibold">{s.ri}</span>
                        <span className="text-text-muted">{s.eup}</span>
                        <span className="ml-auto text-[11px] text-text-muted tnum">{s.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {/* spatial link */}
            <div className={`rounded-2xl p-4 border transition-all duration-500 ${ri ? "bg-brand-soft border-brand/30" : "bg-surface-secondary border-transparent"}`}>
              <div className="flex items-center gap-2 mb-3">
                {linking ? <Loader2 className="w-4 h-4 text-brand animate-spin" /> : <Link2 className={`w-4 h-4 ${ri ? "text-brand" : "text-text-muted"}`} />}
                <span className="text-[12.5px] font-bold text-text-secondary">공간 데이터 연결</span>
                <span className="ml-auto">
                  {ri ? <StatusBadge variant="confirmed" dot>연결됨</StatusBadge> : linking ? <StatusBadge variant="info">조회 중…</StatusBadge> : <StatusBadge>대기</StatusBadge>}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-[12px]">
                {[
                  ["분석 단위", "법정리"],
                  ["법정리 코드", ri?.code],
                  ["좌표 (WGS84)", ri ? `${ri.lat.toFixed(4)}, ${ri.lng.toFixed(4)}` : undefined],
                  ["읍·면", ri?.eup],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-text-muted">{k}</p>
                    {linking && !v ? <div className="skeleton h-4 mt-1 w-20" /> : <p className={`font-semibold mt-0.5 tnum ${v ? "" : "text-text-muted"}`}>{v ?? "–"}</p>}
                  </div>
                ))}
              </div>
            </div>

            <Field label="메모" hint={`${form.memo.length}/300`}>
              <textarea maxLength={300} value={form.memo} onChange={(e) => update("memo", e.target.value)} placeholder="참고 사항이 있으면 입력하세요." rows={3} className="field resize-none" />
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
              <div className="mt-4 space-y-2 text-[12.5px]">
                <p className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" /> {ri ? `${ri.eup} ${ri.ri}` : "위치 미지정"}
                </p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <CalendarClock className="w-3.5 h-3.5 text-text-muted" /> {form.closure_date ? form.closure_date.replace(/-/g, ".") : "폐업 예정일 미지정"}
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
