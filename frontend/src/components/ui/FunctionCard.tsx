import { Check, X, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import Donut from "./Donut";
import { FN, type FnCode } from "../../data/constants";
import type { Decision } from "../../store/DemoStore";

export function confidenceLabel(c: number | null): { text: string; variant: "confirmed" | "review" | "muted" } {
  if (c === null) return { text: "정보 확인 필요", variant: "muted" };
  if (c >= 0.6) return { text: "태깅 후보", variant: "confirmed" };
  if (c >= 0.4) return { text: "확인 필요", variant: "review" };
  return { text: "태깅 제외", variant: "muted" };
}

export default function FunctionCard({
  code,
  index,
  confidence,
  evidence,
  source,
  decision,
  selected,
  onClick,
}: {
  code: FnCode;
  index: number;
  confidence: number | null;
  evidence: string | null;
  source: string | null;
  decision: Decision;
  selected?: boolean;
  onClick?: () => void;
}) {
  const f = FN[code];
  const { text, variant } = confidenceLabel(confidence);
  const pct = confidence === null ? 0 : Math.round(confidence * 100);

  return (
    <button
      onClick={onClick}
      className={`card card-hover p-5 text-left w-full group relative overflow-hidden ${
        selected ? "!border-transparent ring-2" : ""
      }`}
      style={selected ? ({ "--tw-ring-color": f.hex } as React.CSSProperties) : undefined}
    >
      {/* color wash */}
      <span
        className="absolute -right-16 -top-16 w-44 h-44 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${f.hex}1f, transparent 70%)` }}
      />
      <div className="relative flex gap-5">
        <Donut
          size={104}
          thickness={12}
          slices={[{ key: code, value: pct, color: f.hex }, { key: "rest", value: 100 - pct, color: "transparent" }]}
          center={
            <div>
              <p className="text-[22px] font-bold leading-none tnum">{confidence === null ? "–" : pct}</p>
              <p className="text-[10px] text-text-muted mt-0.5">신뢰도 %</p>
            </div>
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md text-ink" style={{ background: f.hex }}>
              {code}
            </span>
            <StatusBadge variant={variant}>{text}</StatusBadge>
            <span className="ml-auto kbd opacity-0 group-hover:opacity-100 transition-opacity">{index + 1}</span>
          </div>
          <h3 className="text-[16px] font-bold">{f.name}</h3>
          <p className="text-[12px] text-text-muted mt-0.5 truncate">{f.desc}</p>
          {evidence && (
            <p className="text-[12px] text-text-secondary mt-3 line-clamp-1">
              <span className="text-text-muted">근거 · </span>
              {evidence}
            </p>
          )}
          {source && <p className="text-[11px] text-text-muted mt-0.5">출처 · {source}</p>}
        </div>
      </div>

      <div className="relative flex items-center justify-between mt-4 pt-3 border-t border-border">
        {decision === "accepted" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-status-ok animate-pop">
            <Check className="w-3.5 h-3.5" strokeWidth={3} /> 담당자 확인됨
          </span>
        ) : decision === "rejected" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-status-error animate-pop">
            <X className="w-3.5 h-3.5" strokeWidth={3} /> 해당 없음으로 처리
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-status-warn animate-pulse" /> 검토 대기
          </span>
        )}
        <span className="text-[12px] font-semibold text-action inline-flex items-center gap-0.5 translate-x-1 opacity-60 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
          상세 보기 <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}
