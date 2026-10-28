import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const HOUSE = "var(--house, #FFFDF5)";
const YARD = "var(--yard, #8FC79A)";

// 지붕 실루엣 4가지 (viewBox 300×50, 아래 변이 카드 윗변에 붙고 양쪽 처마가 벽보다 튀어나온다)
const ROOFS = [
  "M0 50 Q 6 42 18 40 C 70 30, 112 2, 150 2 C 188 2, 230 30, 282 40 Q 294 42 300 50 Z",
  "M0 50 Q 4 40 16 38 C 46 30, 76 12, 112 12 C 146 12, 166 30, 204 22 C 236 14, 262 26, 284 38 Q 296 42 300 50 Z",
  "M0 50 Q 2 44 12 40 L 46 16 Q 54 10 64 10 L 236 10 Q 246 10 254 16 L 288 40 Q 298 44 300 50 Z",
  "M0 50 Q 6 42 20 40 C 56 34, 78 4, 126 4 C 164 4, 182 26, 220 26 C 252 26, 276 34, 286 40 Q 296 44 300 50 Z",
];
// 굴뚝·창문 위치 (지붕 너비 대비 %)
const DETAILS: { chimney: number; window: number }[] = [
  { chimney: 72, window: 50 },
  { chimney: 20, window: 37 },
  { chimney: 80, window: 30 },
  { chimney: 62, window: 41 },
];

/**
 * 카드 위에 지붕을 얹어 집 모양으로 만든다. 카드(.card)를 children으로 넣는다.
 * 지붕·굴뚝은 카드와 같은 단색이고, 창문은 마당(배경)색으로 뚫려 보인다.
 * variant마다 지붕 모양과 굴뚝 위치가 달라 나란히 두면 마을 거리처럼 보인다.
 */
export default function HouseFrame({ variant = 0, children, className = "" }: { variant?: number; children: ReactNode; className?: string }) {
  const v = variant % ROOFS.length;
  const d = DETAILS[v];
  return (
    <div className={`relative pt-[46px] [&>.card]:rounded-t-none ${className}`}>
      <div className="absolute -left-[10px] -right-[10px] top-0 h-[48px] pointer-events-none" aria-hidden>
        {/* 굴뚝 */}
        <svg viewBox="0 0 24 40" className="absolute w-[20px] h-[34px] -top-[14px]" style={{ left: `${d.chimney}%` }}>
          <path d="M4 8 H20 V40 H4 Z" fill={HOUSE} />
          <rect x="1" y="2" width="22" height="9" rx="3" fill={HOUSE} />
        </svg>
        <svg viewBox="0 0 300 50" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={ROOFS[v]} fill={HOUSE} />
        </svg>
        {/* 지붕창 (마당색으로 뚫린 아치 창) */}
        <svg viewBox="0 0 20 22" className="absolute w-[16px] h-[18px] top-[22px] -translate-x-1/2" style={{ left: `${d.window}%` }}>
          <path d="M2 21 V10 A8 8 0 0 1 18 10 V21 Z" fill={YARD} />
          <path d="M10 2 V21 M2 13 H18" stroke={HOUSE} strokeWidth="2" />
        </svg>
      </div>
      {children}
    </div>
  );
}

/** 집 모양 배지 안에 아이콘. 동그란 아이콘 배경 대신 쓴다. */
export function HouseBadge({ icon: Icon, fill, color, size = 44 }: { icon: LucideIcon; fill: string; color: string; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:-rotate-3" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full" aria-hidden>
        <rect x="31" y="6" width="7" height="12" rx="1.5" fill={fill} />
        <path d="M24 5 Q 26 5 27.5 6.2 L 44 19 Q 45 20 45 21.5 V 42 Q 45 45 42 45 H 6 Q 3 45 3 42 V 21.5 Q 3 20 4 19 L 20.5 6.2 Q 22 5 24 5 Z" fill={fill} />
      </svg>
      <Icon className="absolute left-1/2 -translate-x-1/2" style={{ width: size * 0.42, height: size * 0.42, top: size * 0.4, color }} strokeWidth={2.2} />
    </span>
  );
}
