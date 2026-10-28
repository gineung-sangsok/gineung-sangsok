import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Store,
  Layers,
  GitBranch,
  Map,
  Database,
  ClipboardCheck,
  Workflow,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function getClosureId(pathname: string): string {
  const m = pathname.match(/^\/closures\/([^/]+)/);
  return m?.[1] && m[1] !== "new" ? m[1] : "store_0001";
}

const flowItems = (id: string) => [
  { to: "/closures/new", icon: Store, label: "폐업 예정 시설 등록" },
  { to: `/closures/${id}/functions`, icon: Layers, label: "기능 공백 분석" },
  { to: `/closures/${id}/inheritance`, icon: GitBranch, label: "상속안 제안" },
  { to: `/closures/${id}/review`, icon: ClipboardCheck, label: "최종 검토" },
];

function Item({
  to,
  icon: Icon,
  label,
  collapsed,
  end,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 h-11 rounded-2xl text-[14px] font-semibold transition-all duration-200 ${
          collapsed ? "justify-center px-0" : "px-3.5"
        } ${isActive ? "bg-action text-white shadow-[0_8px_18px_-8px_rgba(31,111,229,.6)]" : "text-text-secondary hover:text-action hover:bg-brand-soft"}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {!collapsed && <span className="whitespace-nowrap flex-1">{label}</span>}
          {!collapsed && badge && (
            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-brand-soft text-action"}`}>{badge}</span>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-[calc(100%+12px)] px-2.5 py-1.5 rounded-lg bg-ink text-white text-[12px] whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg z-50">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const inFlow = pathname.startsWith("/closures");
  const [flowOpen, setFlowOpen] = useState(true);

  return (
    <aside
      className="fixed left-0 top-0 h-full bg-surface border-r border-border flex flex-col z-20 transition-[width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
      style={{ width: collapsed ? 76 : 248 }}
    >
      {/* Brand */}
      <div className={`h-[76px] flex items-center ${collapsed ? "justify-center" : "px-6"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand to-action flex items-center justify-center shrink-0 shadow-[0_6px_14px_-6px_rgba(31,111,229,.7)]">
            <Map className="w-5 h-5 text-white" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden animate-fade-in">
              <p className="text-[18px] font-extrabold text-text-primary whitespace-nowrap leading-tight tracking-tight">더 가까이</p>
              <p className="text-[11px] text-text-muted whitespace-nowrap">농촌 생활서비스 연계 플랫폼</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 mt-3 space-y-1 ${collapsed ? "px-3 overflow-visible" : "px-4 overflow-y-auto"}`}>
        <Item to="/" icon={Home} label="대시보드" collapsed={collapsed} end />

        {/* 분석 흐름 그룹 */}
        <div>
          <button
            onClick={() => (collapsed ? onToggle() : setFlowOpen((o) => !o))}
            className={`group relative w-full flex items-center gap-3 h-11 rounded-2xl text-[14px] font-semibold transition-all ${
              collapsed ? "justify-center" : "px-3.5"
            } ${inFlow ? "bg-brand-soft text-action" : "text-text-secondary hover:text-action hover:bg-brand-soft"}`}
          >
            <Workflow className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">분석 흐름</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${flowOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {!collapsed && (
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
              style={{ gridTemplateRows: flowOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="relative ml-[21px] pl-4 py-1.5 space-y-0.5 border-l-2 border-border">
                  {flowItems(getClosureId(pathname)).map((it, i) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13.5px] transition-all ${
                          isActive ? "text-action font-bold bg-brand-soft" : "text-text-secondary hover:text-action hover:translate-x-0.5"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute -left-[22px] w-3 h-3 rounded-full border-2 transition-all ${
                              isActive ? "bg-action border-action scale-110" : "bg-surface border-border-strong"
                            }`}
                          />
                          <span className={`text-[11px] font-bold w-3 ${isActive ? "text-action" : "text-text-muted"}`}>{i + 1}</span>
                          {it.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Item to="/spatial" icon={Map} label="공간 분석" collapsed={collapsed} badge="지도" />
        <Item to="/data" icon={Database} label="데이터 관리" collapsed={collapsed} />

        {!collapsed && <p className="px-3 pt-6 pb-2 text-[11px] font-bold tracking-widest text-text-muted">지원</p>}
        {collapsed && <div className="my-4 mx-2 h-px bg-border" />}
        <button
          className={`group w-full flex items-center gap-3 h-11 rounded-2xl text-[14px] font-semibold text-text-secondary hover:text-action hover:bg-brand-soft transition-all ${
            collapsed ? "justify-center" : "px-3.5"
          }`}
        >
          <LifeBuoy className="w-[18px] h-[18px] group-hover:rotate-45 transition-transform duration-300" />
          {!collapsed && "도움말 · 가이드"}
        </button>
      </nav>

      {/* Bottom */}
      <div className={`pb-4 space-y-1 ${collapsed ? "px-3" : "px-4"}`}>
        <button
          className={`group w-full flex items-center gap-3 h-11 rounded-2xl text-[14px] font-semibold text-text-secondary hover:text-action hover:bg-brand-soft transition-all ${
            collapsed ? "justify-center" : "px-3"
          }`}
        >
          <Settings className="w-[18px] h-[18px] group-hover:rotate-90 transition-transform duration-500" />
          {!collapsed && "설정"}
        </button>
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 h-10 rounded-xl text-[12.5px] text-text-muted hover:text-action hover:bg-brand-soft transition-all ${
            collapsed ? "justify-center" : "px-3"
          }`}
          title={collapsed ? "사이드바 펼치기 ([)" : "사이드바 접기 ([)"}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">사이드바 접기</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-text-muted">[</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
