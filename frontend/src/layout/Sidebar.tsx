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
        `group relative flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium transition-all duration-200 ${
          collapsed ? "justify-center px-0" : "px-3"
        } ${isActive ? "bg-white/[0.12] text-white" : "text-white/65 hover:text-white hover:bg-white/[0.06]"}`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-[-12px] top-2 bottom-2 w-[3px] rounded-r-full bg-[#7FD3C3] transition-all duration-300 ${
              isActive ? "opacity-100" : "opacity-0 -translate-x-1"
            }`}
          />
          <Icon className="w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          {!collapsed && <span className="whitespace-nowrap flex-1">{label}</span>}
          {!collapsed && badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#7FD3C3]/20 text-[#9DE3D5]">{badge}</span>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-[calc(100%+12px)] px-2.5 py-1.5 rounded-lg bg-[#0C3341] text-white text-[12px] whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg z-50">
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
      className="fixed left-0 top-0 h-full bg-sidebar flex flex-col z-20 transition-[width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
      style={{ width: collapsed ? 76 : 248, backgroundImage: "radial-gradient(120% 60% at 0% 0%, #12627A 0%, transparent 60%)" }}
    >
      {/* Brand */}
      <div className={`h-[76px] flex items-center ${collapsed ? "justify-center" : "px-6"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(255,255,255,.08)]">
            <Map className="w-[18px] h-[18px] text-sidebar" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden animate-fade-in">
              <p className="text-[17px] font-bold text-white whitespace-nowrap leading-tight tracking-tight">더 가까이</p>
              <p className="text-[10.5px] text-white/50 whitespace-nowrap">농촌 생활서비스 연계 플랫폼</p>
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
            className={`group relative w-full flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium transition-all ${
              collapsed ? "justify-center" : "px-3"
            } ${inFlow ? "bg-white/[0.12] text-white" : "text-white/65 hover:text-white hover:bg-white/[0.06]"}`}
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
                <div className="relative ml-[21px] pl-4 py-1.5 space-y-0.5 border-l border-white/10">
                  {flowItems(getClosureId(pathname)).map((it, i) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={({ isActive }) =>
                        `relative flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[12.5px] transition-all ${
                          isActive ? "text-white font-semibold bg-white/[0.08]" : "text-white/55 hover:text-white hover:translate-x-0.5"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 transition-all ${
                              isActive ? "bg-[#7FD3C3] border-[#7FD3C3] scale-110" : "bg-sidebar border-white/25"
                            }`}
                          />
                          <span className="text-[10px] font-bold text-white/35 w-3">{i + 1}</span>
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

        {!collapsed && <p className="px-3 pt-6 pb-2 text-[10.5px] font-bold tracking-widest text-white/30">지원</p>}
        {collapsed && <div className="my-4 mx-2 h-px bg-white/10" />}
        <button
          className={`group w-full flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/[0.06] transition-all ${
            collapsed ? "justify-center" : "px-3"
          }`}
        >
          <LifeBuoy className="w-[18px] h-[18px] group-hover:rotate-45 transition-transform duration-300" />
          {!collapsed && "도움말 · 가이드"}
        </button>
      </nav>

      {/* Bottom */}
      <div className={`pb-4 space-y-1 ${collapsed ? "px-3" : "px-4"}`}>
        <button
          className={`group w-full flex items-center gap-3 h-10 rounded-xl text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/[0.06] transition-all ${
            collapsed ? "justify-center" : "px-3"
          }`}
        >
          <Settings className="w-[18px] h-[18px] group-hover:rotate-90 transition-transform duration-500" />
          {!collapsed && "설정"}
        </button>
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 h-10 rounded-xl text-[12px] text-white/45 hover:text-white hover:bg-white/[0.06] transition-all ${
            collapsed ? "justify-center" : "px-3"
          }`}
          title={collapsed ? "사이드바 펼치기 ([)" : "사이드바 접기 ([)"}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && (
            <>
              <span className="flex-1 text-left">사이드바 접기</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">[</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
