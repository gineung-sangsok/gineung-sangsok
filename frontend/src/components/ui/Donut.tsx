import { useEffect, useState, type ReactNode } from "react";

export interface DonutSlice { key: string; value: number; color: string; label?: string }

/**
 * SVG 도넛 차트 — 마운트 시 그려지는 애니메이션 + 조각 hover 강조.
 */
export default function Donut({
  slices,
  size = 160,
  thickness = 22,
  center,
  activeKey,
  onHover,
  track = "#ECE6D9",
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
  activeKey?: string | null;
  onHover?: (key: string | null) => void;
  track?: string;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const r = (size - thickness) / 2 - 4;
  const C = 2 * Math.PI * r;
  const total = Math.max(1, slices.reduce((a, s) => a + s.value, 0));
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        {slices.map((s) => {
          const len = (s.value / total) * C;
          const dash = Math.max(0, len - gap);
          const isActive = activeKey === s.key;
          const dim = activeKey && !isActive;
          const el = (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isActive ? thickness + 6 : thickness}
              strokeDasharray={`${drawn ? dash : 0} ${C}`}
              strokeDashoffset={-offset}
              strokeLinecap={slices.length === 1 ? "round" : "butt"}
              style={{
                transition: "stroke-dasharray 0.9s cubic-bezier(.2,.7,.2,1), stroke-width .18s ease, opacity .18s ease",
                opacity: dim ? 0.35 : 1,
                cursor: onHover ? "pointer" : undefined,
              }}
              onMouseEnter={() => onHover?.(s.key)}
              onMouseLeave={() => onHover?.(null)}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">{center}</div>}
    </div>
  );
}
