import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, CalendarDays, AlertTriangle, Info, CheckCircle2, LogOut, UserCog, ChevronRight } from "lucide-react";
import { NOTIFICATIONS } from "../data/demo";
import { useClickOutside } from "../components/ui/Dropdown";

const CRUMB_PATTERNS: [RegExp, string[]][] = [
  [/^\/$/, ["대시보드"]],
  [/^\/closures\/new$/, ["분석 흐름", "시설 등록"]],
  [/^\/closures\/[^/]+\/functions$/, ["분석 흐름", "기능 공백 분석"]],
  [/^\/closures\/[^/]+\/inheritance$/, ["분석 흐름", "상속안 제안"]],
  [/^\/closures\/[^/]+\/review$/, ["분석 흐름", "최종 검토"]],
  [/^\/spatial$/, ["공간 분석"]],
  [/^\/data$/, ["데이터 관리"]],
];
function getCrumbs(pathname: string): string[] {
  return CRUMB_PATTERNS.find(([re]) => re.test(pathname))?.[1] ?? [];
}

const KIND_ICON = { warn: AlertTriangle, info: Info, ok: CheckCircle2 };
const KIND_TONE = { warn: "bg-[#FBF1E4] text-status-warn", info: "bg-[#E7F0FA] text-status-info", ok: "bg-[#E4F3EC] text-status-ok" };

export default function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const crumbs = getCrumbs(pathname).length ? getCrumbs(pathname) : ["더 가까이"];

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [read, setRead] = useState<Set<number>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useClickOutside(bellRef, () => setBellOpen(false), bellOpen);
  useClickOutside(userRef, () => setUserOpen(false), userOpen);

  const unread = NOTIFICATIONS.filter((n) => !read.has(n.id)).length;
  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <header className="h-[76px] shrink-0 bg-bg/80 backdrop-blur-md flex items-center gap-6 px-8 sticky top-0 z-10">
      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 text-[14px] min-w-[180px]">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
            <span className={i === crumbs.length - 1 ? "font-semibold text-text-primary" : "text-text-muted"}>{c}</span>
          </span>
        ))}
      </div>

      {/* search */}
      <button
        onClick={onOpenSearch}
        className="group flex-1 max-w-[460px] h-12 flex items-center gap-3 px-5 rounded-full bg-surface border border-border shadow-[var(--shadow-card)] hover:border-brand transition-all text-left"
      >
        <Search className="w-[17px] h-[17px] text-text-muted group-hover:text-action transition-colors" />
        <span className="flex-1 text-[14px] text-text-muted">시설, 법정리, 페이지 검색</span>
        <span className="flex gap-1">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden xl:inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface border border-border text-[12.5px] font-semibold text-text-secondary">
          <CalendarDays className="w-3.5 h-3.5" /> {today}
        </span>

        {/* notifications */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors border ${bellOpen ? "bg-brand-soft text-action border-brand-soft" : "bg-surface border-border hover:text-action text-text-secondary"}`}
          >
            <Bell className={`w-[18px] h-[18px] ${unread ? "origin-top hover:animate-[shake_.5s]" : ""}`} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-status-error text-white text-[9.5px] font-bold flex items-center justify-center ring-2 ring-white animate-pop">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-[360px] bg-surface border border-border rounded-2xl overflow-hidden animate-scale-in origin-top-right z-40" style={{ boxShadow: "var(--shadow-pop)" }}>
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
            className="flex items-center gap-2.5 h-12 pl-1.5 pr-3 rounded-full bg-surface border border-border hover:border-brand transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-action text-white text-[12px] font-bold flex items-center justify-center">임</span>
            <span className="text-left">
              <span className="block text-[13px] font-semibold text-action leading-tight">임실군 담당자</span>
              <span className="block text-[11px] text-text-muted">데모 계정</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${userOpen ? "rotate-180" : ""}`} />
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-[220px] bg-surface border border-border rounded-2xl p-1.5 animate-scale-in origin-top-right z-40" style={{ boxShadow: "var(--shadow-pop)" }}>
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
