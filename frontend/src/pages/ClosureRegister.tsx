import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, MapPin, Sparkles, Store, CalendarClock, Link2, AlertCircle, ArrowRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import FlowStepper from "../components/ui/FlowStepper";
import StatusBadge, { FACILITY_STATUS_BADGE } from "../components/ui/StatusBadge";
import { FN, FUNCTIONS, type FacilityStatus, type FnCode } from "../data/demo";
import { useDemo } from "../store/DemoStore";
import { useToast } from "../components/ui/Toast";

const BIZ_TYPES: { label: string; fns: FnCode[] }[] = [
  { label: "식료품점", fns: ["F01", "F02", "F04"] },
  { label: "슈퍼마켓", fns: ["F01", "F02", "F03"] },
  { label: "정육점", fns: ["F02"] },
  { label: "농협마트", fns: ["F01", "F02", "F03"] },
  { label: "정미소", fns: ["F03"] },
  { label: "약국", fns: ["F04"] },
];

const STATUS: FacilityStatus[] = ["CLOSING", "SUSPENDED", "SEASONAL", "CLOSED", "ACTIVE"];

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
  const { addFacility } = useDemo();

  const [form, setForm] = useState({
    name: "",
    biz_type: "식료품점",
    status: "CLOSING" as FacilityStatus,
    closure_date: "",
    address: "",
    memo: "",
  });
  const [fns, setFns] = useState<FnCode[]>(["F01", "F02", "F04"]);
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

  const pickBiz = (b: (typeof BIZ_TYPES)[number]) => {
    update("biz_type", b.label);
    setFns(b.fns);
  };

  const setDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    update("closure_date", localDateString(d));
  };

  const dday = form.closure_date ? Math.ceil((new Date(form.closure_date).getTime() - Date.now()) / 86400000) : null;

  const completeness = [form.name, form.biz_type, form.closure_date, ri, fns.length].filter(Boolean).length / 5;

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "시설명을 입력하세요";
    if (!ri) e.address = "목록에서 법정리를 선택하세요";
    if (!form.closure_date) e.closure_date = "날짜를 선택하세요";
    setErrors(e);
    if (Object.keys(e).length) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const id = `store_${crypto.randomUUID().slice(0, 8)}`;
      addFacility({
        entity_id: id,
        entity_type: "store",
        name: form.name,
        biz_type: form.biz_type,
        status: form.status,
        closure_date: form.closure_date,
        village_id: ri!.code,
        eup_myeon: ri!.eup,
        ri: ri!.ri,
        address: form.address,
        location: { lat: ri!.lat, lng: ri!.lng },
        affected_pop: 80 + Math.round(Math.random() * 200),
        functions: fns,
        stage: "functions",
        updated_at: localDateString(new Date()),
        verified_by_officer: false,
        data_sources: ["사업자 신고 정보"],
      });
      toast({ title: `${form.name} 등록 완료`, desc: "기능 공백 분석을 시작합니다." });
      navigate(`/closures/${id}/functions`);
    }, 900);
  };

  const st = FACILITY_STATUS_BADGE[form.status];

  return (
    <div>
      <PageHeader
        eyebrow={<FlowStepper />}
        title="폐업 예정 시설 등록"
        desc="시설 정보를 등록하면 해당 시설이 제공하던 생활 기능을 자동으로 분석합니다."
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Form */}
        <div ref={formRef} className={`col-span-8 space-y-5 stagger ${shake ? "animate-shake" : ""}`}>
          <section className="card p-6 space-y-5">
            <h2 className="text-[15px] font-bold text-action flex items-center gap-2"><Store className="w-4 h-4" /> 기본 정보</h2>
            <Field label="시설명" required error={errors.name} hint={`${form.name.length}/30`}>
              <input
                type="text"
                maxLength={30}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="예: ○○상회"
                className={`field ${errors.name ? "!border-status-error" : ""}`}
              />
            </Field>

            <Field label="업종" hint="업종에 따라 예상 기능이 자동 선택됩니다">
              <div className="flex flex-wrap gap-2">
                {BIZ_TYPES.map((b) => {
                  const on = form.biz_type === b.label;
                  return (
                    <button
                      key={b.label}
                      onClick={() => pickBiz(b)}
                      className={`h-9 px-3.5 rounded-xl text-[13px] font-semibold border transition-all active:scale-95 ${
                        on ? "bg-action text-white border-action shadow-[0_6px_14px_-8px_rgba(14,82,102,.9)]" : "bg-surface border-border text-text-secondary hover:border-border-strong hover:-translate-y-0.5"
                      }`}
                    >
                      {on && <Check className="w-3.5 h-3.5 inline mr-1 -mt-0.5" strokeWidth={3} />}
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="시설 상태">
              <div className="grid grid-cols-5 gap-2">
                {STATUS.map((s) => {
                  const b = FACILITY_STATUS_BADGE[s];
                  const on = form.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => update("status", s)}
                      className={`h-14 rounded-xl border text-left px-3 transition-all ${on ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-border hover:border-border-strong"}`}
                    >
                      <p className={`text-[10px] font-bold tracking-wide ${on ? "text-brand" : "text-text-muted"}`}>{s}</p>
                      <p className="text-[12.5px] font-semibold">{b.label}</p>
                    </button>
                  );
                })}
              </div>
            </Field>
          </section>

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
          </section>

          <section className="card p-6 space-y-5">
            <h2 className="text-[15px] font-bold text-action flex items-center gap-2"><Sparkles className="w-4 h-4" /> 제공 기능 (예상)</h2>
            <div className="grid grid-cols-4 gap-3">
              {FUNCTIONS.map((f) => {
                const on = fns.includes(f.code);
                return (
                  <button
                    key={f.code}
                    onClick={() => setFns((p) => (on ? p.filter((x) => x !== f.code) : [...p, f.code]))}
                    className={`relative rounded-2xl border p-4 text-left transition-all active:scale-[.98] ${on ? "border-transparent" : "border-border hover:border-border-strong"}`}
                    style={on ? { background: `${f.hex}12`, boxShadow: `inset 0 0 0 2px ${f.hex}` } : undefined}
                  >
                    <span
                      className={`absolute top-3 right-3 w-5 h-5 rounded-md flex items-center justify-center transition-all ${on ? "scale-100" : "scale-0"}`}
                      style={{ background: f.hex }}
                    >
                      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                    </span>
                    <p className="text-[11px] font-bold" style={{ color: f.hex }}>{f.code}</p>
                    <p className="text-[13.5px] font-bold mt-0.5">{f.name}</p>
                    <p className="text-[11px] text-text-muted mt-1 leading-snug">{f.desc}</p>
                  </button>
                );
              })}
            </div>
            <Field label="메모" hint={`${form.memo.length}/300`}>
              <textarea maxLength={300} value={form.memo} onChange={(e) => update("memo", e.target.value)} placeholder="참고 사항이 있으면 입력하세요." rows={3} className="field resize-none" />
            </Field>
          </section>
        </div>

        {/* Live preview */}
        <aside className="col-span-4 sticky top-4 space-y-4 animate-fade-up" style={{ animationDelay: ".15s" }}>
          <div className="card overflow-hidden">
            <div className="h-24 relative bg-sidebar" style={{ backgroundImage: "radial-gradient(80% 120% at 100% 0%, #2E8C7E 0%, transparent 60%)" }}>
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
              <p className={`text-[19px] font-bold ${form.name ? "" : "text-text-muted"}`}>{form.name || "시설명"}</p>
              <p className="text-[12.5px] text-text-muted mt-0.5 flex items-center gap-1.5">
                {form.biz_type} · <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
              </p>
              <div className="mt-4 space-y-2 text-[12.5px]">
                <p className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" /> {ri ? `${ri.eup} ${ri.ri}` : "위치 미지정"}
                </p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <CalendarClock className="w-3.5 h-3.5 text-text-muted" /> {form.closure_date ? form.closure_date.replace(/-/g, ".") : "폐업 예정일 미지정"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4 min-h-[26px]">
                {fns.map((c) => (
                  <span key={c} className="px-2 py-1 rounded-lg text-[11px] font-bold text-white animate-pop" style={{ background: FN[c].hex }}>
                    {c} {FN[c].short}
                  </span>
                ))}
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
              <button onClick={() => navigate("/")} className="btn btn-ghost flex-1">취소</button>
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
