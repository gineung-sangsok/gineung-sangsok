import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const STROKE = "#A9D29A";
const ROOF = "#DDF0D2";

// 지붕 모양 4가지 (viewBox 300×40, 아래 변이 카드 윗변에 붙는다)
const ROOFS = [
  "M0 40 C 60 30, 110 4, 150 4 C 190 4, 240 30, 300 40 Z",
  "M0 40 C 30 26, 70 10, 112 10 C 150 10, 170 26, 205 18 C 240 10, 270 24, 300 40 Z",
  "M0 40 L 34 14 Q 40 9 48 9 L 252 9 Q 260 9 266 14 L 300 40 Z",
  "M0 40 C 50 34, 80 2, 128 2 C 168 2, 186 22, 222 22 C 256 22, 280 30, 300 40 Z",
];
// 굴뚝·창문 위치 (지붕 너비 대비 %)
const DETAILS: { chimney: number; window: number }[] = [
  { chimney: 74, window: 50 },
  { chimney: 22, window: 37 },
  { chimney: 80, window: 30 },
  { chimney: 64, window: 42 },
];

/**
 * 카드 위에 지붕을 얹어 집 모양으로 만든다. 카드(.card)를 children으로 넣는다.
 * variant마다 지붕 모양과 굴뚝 위치가 달라 나란히 두면 마을 거리처럼 보인다.
 */
export default function HouseFrame({ variant = 0, children, className = "" }: { variant?: number; children: ReactNode; className?: string }) {
  const v = variant % ROOFS.length;
  const d = DETAILS[v];
  return (
    <div className={`relative pt-[34px] ${className}`}>
      <div className="absolute left-4 right-4 top-0 h-[36px] pointer-events-none" aria-hidden>
        {/* 굴뚝 */}
        <svg viewBox="0 0 22 30" className="absolute w-[18px] h-[26px] -top-[10px]" style={{ left: `${d.chimney}%` }}>
          <rect x="3" y="6" width="16" height="24" rx="2" fill="#F4BA94" stroke="#E0A07A" strokeWidth="2" />
          <rect x="1" y="3" width="20" height="6" rx="2" fill="#EBA27A" stroke="#E0A07A" strokeWidth="2" />
        </svg>
        <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path d={ROOFS[v]} fill={ROOF} stroke={STROKE} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        {/* 지붕창 */}
        <svg viewBox="0 0 20 20" className="absolute w-[16px] h-[16px] top-[16px] -translate-x-1/2" style={{ left: `${d.window}%` }}>
          <path d="M2 18 V9 A8 8 0 0 1 18 9 V18 Z" fill="#BFE0F2" stroke={STROKE} strokeWidth="2" />
          <path d="M10 3 V18 M2 11 H18" stroke={STROKE} strokeWidth="1.5" />
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
