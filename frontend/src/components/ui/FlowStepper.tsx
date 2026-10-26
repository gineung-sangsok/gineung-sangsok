import { generatePath, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";

export const FLOW = [
  { to: "/closures/new", label: "시설 등록", short: "등록" },
  { to: "/closures/:id/functions", label: "기능 공백 분석", short: "기능 분석" },
  { to: "/closures/:id/inheritance", label: "상속안 제안", short: "상속안" },
  { to: "/closures/:id/review", label: "최종 검토", short: "검토" },
];

/** 분석 흐름 4단계 진행 표시 — 클릭으로 단계 이동 */
export default function FlowStepper() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { id = "demo" } = useParams();
  const flow = FLOW.map((s) => ({ ...s, to: generatePath(s.to, { id }) }));
  const current = flow.findIndex((s) => pathname.startsWith(s.to));

  return (
    <div className="flex items-center gap-1.5">
      {flow.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.to} className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(s.to)}
              className={`group flex items-center gap-2 h-8 pl-1 pr-3 rounded-full text-[12px] font-semibold transition-all ${
                active
                  ? "bg-action text-white shadow-[0_6px_16px_-8px_rgba(14,82,102,.8)]"
                  : done
                    ? "bg-brand-soft text-action hover:bg-[#D6EBE6]"
                    : "bg-surface border border-border text-text-muted hover:text-text-secondary hover:border-border-strong"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-transform group-hover:scale-110 ${
                  active ? "bg-white/20" : done ? "bg-brand text-white" : "bg-surface-secondary"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {s.short}
            </button>
            {i < flow.length - 1 && (
              <span className="w-6 h-[2px] rounded-full bg-border overflow-hidden">
                <span
                  className="block h-full bg-brand transition-all duration-500"
                  style={{ width: i < current ? "100%" : "0%" }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
