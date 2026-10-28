import { useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Search, ChevronDown, LogOut, UserCog, Map as MapIcon } from "lucide-react";
import { useClickOutside } from "../components/ui/Dropdown";

function getClosureId(pathname: string): string {
  const m = pathname.match(/^\/closures\/([^/]+)/);
  return m?.[1] && m[1] !== "new" ? m[1] : "closure_0001";
}

const navItems = (id: string) => [
  { to: "/dashboard", label: "대시보드", end: true },
  { to: "/closures/new", label: "시설 등록" },
  { to: `/closures/${id}/functions`, label: "기능 분석" },
  { to: `/closures/${id}/inheritance`, label: "상속안" },
  { to: `/closures/${id}/review`, label: "최종 검토" },
  { to: "/spatial", label: "공간 분석" },
];

export default function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { pathname } = useLocation();

  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  useClickOutside(userRef, () => setUserOpen(false), userOpen);

  return (
    <header className="h-[68px] shrink-0 bg-ink text-white flex items-center gap-6 px-8 sticky top-0 z-20">
      <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
        <span className="w-9 h-9 rounded-full bg-sage text-ink flex items-center justify-center">
          <MapIcon className="w-[18px] h-[18px]" strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[16px] font-extrabold tracking-[0.08em]">MAJUNG</span>
          <span className="block text-[10.5px] text-white/50">마중 · 농촌 생활서비스 연계</span>
        </span>
      </NavLink>

      <nav className="flex items-center gap-1 ml-4">
        {navItems(getClosureId(pathname)).map((it) => (
          <NavLink
            key={it.label}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `h-9 px-3.5 rounded-full text-[13.5px] font-semibold flex items-center transition-colors whitespace-nowrap ${
                isActive ? "bg-sage text-ink" : "text-white/70 hover:text-white hover:bg-white/10"
              }`
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          title="검색 (⌘K)"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/75 hover:text-ink hover:bg-sage transition-colors"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* user */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2.5 h-11 pl-1.5 pr-3 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-sage text-ink text-[12px] font-bold flex items-center justify-center">임</span>
            <span className="text-left">
              <span className="block text-[13px] font-semibold text-white leading-tight">임실군 담당자</span>
              <span className="block text-[11px] text-white/50">데모 계정</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${userOpen ? "rotate-180" : ""}`} />
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-[220px] bg-surface border border-border rounded-2xl p-1.5 animate-scale-in origin-top-right z-40 text-text-primary" style={{ boxShadow: "var(--shadow-pop)" }}>
              <button className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-surface-secondary text-[13px]">
                <UserCog className="w-4 h-4 text-text-muted" /> 계정 설정
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl hover:bg-[#FBE9E9] hover:text-status-error text-[13px] transition-colors">
                <LogOut className="w-4 h-4" /> 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
