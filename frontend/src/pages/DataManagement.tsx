import { useEffect, useMemo, useState } from "react";
import { Search, ArrowUpDown, Download, ShieldCheck, X, Database, RefreshCw } from "lucide-react";
import PageHeader, { DemoTag } from "../components/ui/PageHeader";
import Segmented from "../components/ui/Segmented";
import Dropdown from "../components/ui/Dropdown";
import StatusBadge, { FACILITY_STATUS_BADGE } from "../components/ui/StatusBadge";
import Donut from "../components/ui/Donut";
import EmptyState from "../components/ui/EmptyState";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { DATA_ROWS, FN } from "../data/demo";
import { useToast } from "../components/ui/Toast";

const TABS = Object.keys(DATA_ROWS);
type Row = (typeof DATA_ROWS)[string][number] & { key: string };

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative w-9 h-5 rounded-full transition-colors ${on ? "bg-status-ok" : "bg-border-strong"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

export default function DataManagement() {
  const toast = useToast();
  const [tab, setTab] = useState(TABS[0]);
  const [q, setQ] = useState("");
  const [vf, setVf] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<{ key: "name" | "updated"; dir: 1 | -1 }>({ key: "updated", dir: -1 });
  const [verified, setVerified] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    Object.entries(DATA_ROWS).forEach(([t, rows]) => rows.forEach((r, i) => (o[`${t}-${i}`] = r.verified)));
    return o;
  });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setChecked(new Set());
  }, [tab, q, vf]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [tab]);

  const rows: Row[] = useMemo(() => {
    const s = q.trim();
    return DATA_ROWS[tab]
      .map((r, i) => ({ ...r, key: `${tab}-${i}` }))
      .filter((r) => !s || `${r.name}${r.type}${r.ri}${r.source}`.includes(s))
      .filter((r) => (vf === "all" ? true : vf === "yes" ? verified[r.key] : !verified[r.key]))
      .sort((a, b) => {
        const primary = sort.key === "name"
          ? a.name.localeCompare(b.name, "ko")
          : a.updated > b.updated ? 1 : a.updated < b.updated ? -1 : 0;
        return (primary || a.name.localeCompare(b.name, "ko")) * sort.dir;
      });
  }, [tab, q, vf, sort, verified]);

  const allKeys = Object.keys(verified);
  const verifiedRate = Math.round((allKeys.filter((k) => verified[k]).length / allKeys.length) * 100);
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.key));
  const selectedRows = rows.filter((r) => checked.has(r.key));

  const toggleSort = (key: typeof sort.key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  return (
    <div>
      <PageHeader
        en="Data Management"
        title="데이터 관리"
        badge={<DemoTag />}
        desc="분석에 활용된 데이터의 출처와 검증 상태를 확인하고 관리합니다."
        actions={
          <>
            <button onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); toast({ title: "데이터를 새로 불러왔습니다" }); }, 700); }} className="btn btn-ghost">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> 새로고침
            </button>
            <button onClick={() => toast({ kind: "info", title: "CSV 내보내기", desc: `${tab} ${rows.length}건 (데모)` })} className="btn btn-primary">
              <Download className="w-4 h-4" /> 내보내기
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-5 mb-5 stagger">
        {TABS.slice(0, 3).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`card card-hover p-5 text-left ${tab === t ? "ring-2 ring-brand/40" : ""}`}>
            <p className="text-[13px] font-semibold text-text-secondary">{t} 데이터</p>
            <p className="text-[28px] font-bold mt-1 tracking-tight"><AnimatedNumber value={DATA_ROWS[t].length} /><span className="text-[14px] text-text-muted ml-0.5">건</span></p>
            <p className="text-[11.5px] text-text-muted mt-1">최근 갱신 {DATA_ROWS[t].map((r) => r.updated).sort().pop()?.replace(/-/g, ".")}</p>
          </button>
        ))}
        <div className="card p-5 flex items-center gap-4">
          <Donut size={84} thickness={11} slices={[{ key: "v", value: verifiedRate, color: "#2E8466" }, { key: "n", value: 100 - verifiedRate, color: "transparent" }]} center={<span className="text-[16px] font-bold tnum">{verifiedRate}%</span>} />
          <div>
            <p className="text-[13px] font-semibold text-text-secondary">담당자 검증률</p>
            <p className="text-[11.5px] text-text-muted mt-1 leading-snug">스위치를 켜면 즉시 반영됩니다</p>
          </div>
        </div>
      </div>

      <div className="card p-5 animate-fade-up">
        <Segmented
          variant="underline"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({ value: t, label: <span className="inline-flex items-center gap-1.5">{t}<span className="text-[10.5px] px-1.5 rounded-md bg-surface-secondary text-text-muted">{DATA_ROWS[t].length}</span></span> }))}
        />

        <div className="flex items-center gap-2 mt-4 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${tab} 검색`} className="field !h-8 !text-[12px] !pl-8 !w-[240px] !rounded-[9px]" />
          </div>
          <Dropdown value={vf} onChange={setVf} options={[{ value: "all", label: "검증 상태: 전체" }, { value: "yes", label: "검증 완료" }, { value: "no", label: "확인 필요" }]} />

          {selectedRows.length > 0 && (
            <div className="ml-auto flex items-center gap-2 h-9 pl-3 pr-1 rounded-xl bg-[#1C1C1C] text-white animate-scale-in">
              <span className="text-[12px] font-semibold">{selectedRows.length}개 선택</span>
              <button
                onClick={() => {
                  setVerified((p) => { const n = { ...p }; selectedRows.forEach((r) => (n[r.key] = true)); return n; });
                  toast({ title: `${selectedRows.length}건 검증 완료 처리` });
                  setChecked(new Set());
                }}
                className="h-7 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-semibold inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> 일괄 검증
              </button>
              <button onClick={() => setChecked(new Set())} className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-tint text-action">
                <th className="w-10 py-3 pl-4">
                  <input type="checkbox" checked={allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.key)))} className="accent-[#2F5E43] w-4 h-4 cursor-pointer" />
                </th>
                <th className="text-left font-bold py-3 px-3 cursor-pointer hover:text-brand" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">이름 <ArrowUpDown className={`w-3 h-3 ${sort.key === "name" ? "text-brand" : "text-text-muted"}`} /></span>
                </th>
                <th className="text-left font-bold py-3 px-3">유형</th>
                <th className="text-left font-bold py-3 px-3">법정리</th>
                <th className="text-left font-bold py-3 px-3">제공 기능</th>
                <th className="text-left font-bold py-3 px-3">상태</th>
                <th className="text-left font-bold py-3 px-3">출처</th>
                <th className="text-left font-bold py-3 px-3 cursor-pointer hover:text-brand" onClick={() => toggleSort("updated")}>
                  <span className="inline-flex items-center gap-1">갱신일 <ArrowUpDown className={`w-3 h-3 ${sort.key === "updated" ? "text-brand" : "text-text-muted"}`} /></span>
                </th>
                <th className="text-left font-bold py-3 px-4">검증</th>
              </tr>
            </thead>
            <tbody key={`${tab}-${vf}-${sort.key}-${sort.dir}`} className={loading ? "" : "stagger"}>
              {loading
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td colSpan={9} className="px-4 py-3.5"><div className="skeleton h-5" style={{ width: `${90 - i * 8}%` }} /></td>
                    </tr>
                  ))
                : rows.map((r) => {
                    const on = checked.has(r.key);
                    const st = FACILITY_STATUS_BADGE[r.status];
                    return (
                      <tr
                        key={r.key}
                        onClick={() => setChecked((p) => { const n = new Set(p); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })}
                        className={`border-t border-border cursor-pointer transition-colors ${on ? "bg-brand-soft/60" : "hover:bg-surface-tint"}`}
                      >
                        <td className="py-3 pl-4"><input type="checkbox" readOnly checked={on} className="accent-[#2F5E43] w-4 h-4 pointer-events-none" /></td>
                        <td className="py-3 px-3 font-semibold">{r.name}</td>
                        <td className="py-3 px-3 text-text-secondary">{r.type}</td>
                        <td className="py-3 px-3 text-text-secondary">{r.ri}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {r.fns.length ? r.fns.map((c) => <span key={c} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-md text-ink" style={{ background: FN[c].hex }}>{c}</span>) : <span className="text-text-muted">–</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3">{st && <StatusBadge variant={st.variant}>{st.label}</StatusBadge>}</td>
                        <td className="py-3 px-3 text-text-secondary text-[12px]">{r.source}</td>
                        <td className="py-3 px-3 text-text-muted tnum text-[12px]">{r.updated.replace(/-/g, ".")}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Switch on={verified[r.key]} onChange={() => setVerified((p) => ({ ...p, [r.key]: !p[r.key] }))} />
                            <span className={`text-[11px] font-semibold ${verified[r.key] ? "text-status-ok" : "text-status-warn"}`}>{verified[r.key] ? "검증됨" : "확인 필요"}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9}><EmptyState icon={Database} message={`조건에 맞는 ${tab} 데이터가 없습니다.`} /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3.5 bg-surface-tint border border-border rounded-xl flex items-center gap-2 text-[12px] text-text-secondary">
          <StatusBadge variant="info">안내</StatusBadge>
          검증되지 않은 데이터는 "확인 필요"로 표시됩니다. <code className="text-[11px] px-1.5 py-0.5 rounded bg-surface-secondary">verified_by_officer</code> 는 담당자 검증 여부를 나타냅니다.
        </div>
      </div>
    </div>
  );
}
