import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Home, Store, Layers, GitBranch, Map, Database, ClipboardCheck, CornerDownLeft, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDemo } from "../store/DemoStore";

interface Cmd { id: string; group: string; label: string; hint?: string; icon: LucideIcon; to: string }

const PAGES: Cmd[] = [
  { id: "p-home", group: "페이지", label: "대시보드", icon: Home, to: "/" },
  { id: "p-new", group: "페이지", label: "폐업 예정 시설 등록", icon: Store, to: "/closures/new", hint: "N" },
  { id: "p-fn", group: "페이지", label: "기능 공백 분석", icon: Layers, to: "/closures/demo/functions" },
  { id: "p-inh", group: "페이지", label: "상속안 제안", icon: GitBranch, to: "/closures/demo/inheritance" },
  { id: "p-rev", group: "페이지", label: "최종 검토", icon: ClipboardCheck, to: "/closures/demo/review" },
  { id: "p-map", group: "페이지", label: "공간 분석 (지도)", icon: Map, to: "/spatial" },
  { id: "p-data", group: "페이지", label: "데이터 관리", icon: Database, to: "/data" },
];

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { facilities } = useDemo();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const all = useMemo<Cmd[]>(
    () => [
      ...PAGES,
      ...facilities.map((f) => ({
        id: `f-${f.id}`,
        group: "시설",
        label: f.name,
        hint: `${f.eupMyeon} ${f.ri}`,
        icon: Building2,
        to: "/closures/demo/functions",
      })),
    ],
    [facilities],
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 12);
    return all.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(s));
  }, [q, all]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setIdx(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  const run = (c?: Cmd) => {
    if (!c) return;
    navigate(c.to);
    onClose();
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[14vh] animate-fade-in" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-[#0A2733]/40 backdrop-blur-[3px]" />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-[600px] bg-surface rounded-2xl overflow-hidden animate-scale-in"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex items-center gap-3 px-5 h-[58px] border-b border-border">
          <Search className="w-[18px] h-[18px] text-text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter") run(results[idx]);
              if (e.key === "Escape") onClose();
            }}
            placeholder="페이지, 시설, 법정리 검색…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted"
          />
          <span className="kbd">ESC</span>
        </div>
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 thin-scroll">
          {results.length === 0 && <p className="text-center text-[13px] text-text-muted py-10">"{q}"에 대한 결과가 없습니다.</p>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <div key={c.id}>
                {header && <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold text-text-muted">{header}</p>}
                <button
                  data-i={i}
                  onMouseMove={() => setIdx(i)}
                  onClick={() => run(c)}
                  className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-left transition-colors ${
                    i === idx ? "bg-brand-soft" : ""
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === idx ? "bg-action text-white" : "bg-surface-secondary text-text-secondary"} transition-colors`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[13.5px] font-medium flex-1">{c.label}</span>
                  {c.hint && <span className="text-[12px] text-text-muted">{c.hint}</span>}
                  {i === idx && <CornerDownLeft className="w-3.5 h-3.5 text-action" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 px-5 h-10 border-t border-border bg-surface-tint text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> 이동</span>
          <span className="flex items-center gap-1.5"><span className="kbd">↵</span> 열기</span>
          <span className="flex items-center gap-1.5 ml-auto"><span className="kbd">⌘</span><span className="kbd">K</span> 언제든 열기</span>
        </div>
      </div>
    </div>
  );
}
