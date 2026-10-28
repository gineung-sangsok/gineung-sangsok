import { useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, AlertTriangle, Info, CheckCircle2, LogOut, UserCog, Map as MapIcon } from "lucide-react";
import { NOTIFICATIONS } from "../data/demo";
import { useClickOutside } from "../components/ui/Dropdown";

function getClosureId(pathname: string): string {
  const m = pathname.match(/^\/closures\/([^/]+)/);
  return m?.[1] && m[1] !== "new" ? m[1] : "store_0001";
}

const navItems = (id: string) => [
  { to: "/dashboard", label: "대시보드", end: true },
  { to: "/closures/new", label: "시설 등록" },
  { to: `/closures/${id}/functions`, label: "기능 분석" },
  { to: `/closures/${id}/inheritance`, label: "상속안" },
  { to: `/closures/${id}/review`, label: "최종 검토" },
  { to: "/spatial", label: "공간 분석" },
  { to: "/data", label: "데이터 관리" },
];

const KIND_ICON = { warn: AlertTriangle, info: Info, ok: CheckCircle2 };
const KIND_TONE = { warn: "bg-[#FBF1E4] text-status-warn", info: "bg-[#E7F0FA] text-status-info", ok: "bg-[#E4F3EC] text-status-ok" };

export default function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [read, setRead] = useState<Set<number>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useClickOutside(bellRef, () => setBellOpen(false), bellOpen);
  useClickOutside(userRef, () => setUserOpen(false), userOpen);

  const unread = NOTIFICATIONS.filter((n) => !read.has(n.id)).length;

  return (
    <header className="h-[68px] shrink-0 bg-ink text-white flex items-center gap-6 px-8 sticky top-0 z-20">
      <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
        <span className="w-9 h-9 rounded-full bg-lime text-ink flex items-center justify-center">
          <MapIcon className="w-[18px] h-[18px]" strokeWidth={2.4} />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[18px] font-black tracking-tight">더 가까이</span>
          <span className="block text-[10.5px] text-white/50">농촌 생활서비스 연계 플랫폼</span>
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
                isActive ? "bg-lime text-ink" : "text-white/70 hover:text-white hover:bg-white/10"
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/75 hover:text-ink hover:bg-lime transition-colors"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* notifications */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${bellOpen ? "bg-lime text-ink" : "text-white/75 hover:text-ink hover:bg-lime"}`}
          >
            <Bell className={`w-[18px] h-[18px] ${unread ? "origin-top hover:animate-[shake_.5s]" : ""}`} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-status-error text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-ink animate-pop">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-[360px] bg-surface border border-border rounded-2xl overflow-hidden animate-scale-in origin-top-right z-40 text-text-primary" style={{ boxShadow: "var(--shadow-pop)" }}>
              <div className="flex items-center justify-between px-4 h-12 border-b border-border">
                <p className="text-[14px] font-bold">알림</p>
                <button
                  onClick={() => setRead(new Set(NOTIFICATIONS.map((n) => n.id)))}
                  className="text-[12px] font-semibold text-brand hover:underline"
                >
                  모두 읽음
                </button>
              </div>
              <div className="p-1.5">
                {NOTIFICATIONS.map((n) => {
                  const Icon = KIND_ICON[n.kind];
                  const isRead = read.has(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setRead((p) => new Set(p).add(n.id));
                        setBellOpen(false);
                        navigate(n.to);
                      }}
                      className="w-full flex gap-3 p-2.5 rounded-xl hover:bg-surface-secondary transition-colors text-left"
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${KIND_TONE[n.kind]}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[12.5px] ${isRead ? "text-text-muted" : "font-semibold text-text-primary"}`}>{n.title}</span>
                        <span className="block text-[11px] text-text-muted mt-0.5">{n.time}</span>
                      </span>
                      {!isRead && <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        
        {/* user */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2.5 h-11 pl-1.5 pr-3 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-lime text-ink text-[12px] font-bold flex items-center justify-center">임</span>
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
