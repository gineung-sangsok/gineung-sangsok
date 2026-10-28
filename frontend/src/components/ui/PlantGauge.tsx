import { FN, type FnCode } from "../../data/constants";
import { FN_ICON } from "./FunctionIcon";

const LINE = "#24352B";
const POT_TOP = 150;
const MAX_STEM = 112;

/**
 * 화분에서 자라는 식물 게이지. 줄기 높이 = 서비스가 이어지는 마을 비율(100 - 공백%).
 * 꼭대기 꽃 가운데에 기능 아이콘이 있다.
 */
export default function PlantGauge({ code, gap, active = false }: { code: FnCode; gap: number; active?: boolean }) {
  const f = FN[code];
  const Icon = FN_ICON[code];
  const grown = Math.max(8, 100 - gap);
  const top = POT_TOP - (grown / 100) * MAX_STEM;
  const stem = `M90 ${POT_TOP} C 84 ${POT_TOP - 30}, 97 ${(POT_TOP + top) / 2}, 90 ${top}`;
  const leaves = Array.from({ length: Math.max(1, Math.floor((POT_TOP - top) / 26)) }, (_, i) => ({
    y: POT_TOP - 20 - i * 26,
    left: i % 2 === 0,
  }));

  return (
    <svg viewBox="0 0 180 200" className="w-[132px] h-[146px] shrink-0 overflow-visible" aria-hidden>
      {/* 눈금 */}
      {[0, 50, 100].map((t) => {
        const y = POT_TOP - (t / 100) * MAX_STEM;
        return (
          <g key={t}>
            <line x1="150" x2="158" y1={y} y2={y} stroke="#9DBBA5" strokeWidth="2" strokeLinecap="round" />
            <text x="162" y={y + 4} fontSize="10" fontWeight="700" fill="#86978B">{t}</text>
          </g>
        );
      })}
      <line x1="154" x2="154" y1={POT_TOP} y2={POT_TOP - MAX_STEM} stroke="#D3E5D8" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />

      <g className={active ? "plant-sway" : ""} style={{ transformOrigin: `90px ${POT_TOP}px` }}>
        {/* 줄기 (테두리 → 초록) */}
        <path d={stem} stroke={LINE} strokeWidth="8" fill="none" strokeLinecap="round" pathLength={1} className="plant-stem" />
        <path d={stem} stroke="#6DBA78" strokeWidth="4" fill="none" strokeLinecap="round" pathLength={1} className="plant-stem" />
        {/* 잎 */}
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(90 ${l.y}) rotate(${l.left ? -35 : 215})`}>
            <g className="plant-pop" style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
              <path d="M0 0 C 8 -14, 30 -14, 36 0 C 30 12, 8 12, 0 0 Z" fill="#9AD39A" stroke={LINE} strokeWidth="2" />
              <path d="M4 0 H28" stroke={LINE} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
            </g>
          </g>
        ))}
        {/* 꽃 */}
        <g transform={`translate(90 ${top})`}>
          <g className="plant-pop" style={{ animationDelay: `${0.6 + leaves.length * 0.15}s` }}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="0" cy="-17" rx="10" ry="13" fill={f.hex} stroke={LINE} strokeWidth="2" transform={`rotate(${a})`} />
            ))}
            <circle r="15" fill="#FFFBEA" stroke={LINE} strokeWidth="2" />
            <Icon x={-9} y={-9} width={18} height={18} color={f.deep} strokeWidth={2.4} />
          </g>
        </g>
      </g>

      {/* 화분 */}
      <path d={`M58 ${POT_TOP + 8} L122 ${POT_TOP + 8} L114 ${POT_TOP + 44} Q 90 ${POT_TOP + 50} 66 ${POT_TOP + 44} Z`} fill="#EBA27A" stroke={LINE} strokeWidth="2" />
      <rect x="52" y={POT_TOP - 2} width="76" height="14" rx="6" fill="#F4BA94" stroke={LINE} strokeWidth="2" />
      <path d={`M70 ${POT_TOP + 24} q 6 -5 12 0 q 6 5 12 0 q 6 -5 12 0`} stroke="#FFFBEA" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />

      <style>{`
        .plant-stem { stroke-dasharray: 1; stroke-dashoffset: 1; animation: plant-grow 1s cubic-bezier(.4,0,.2,1) .1s forwards; }
        @keyframes plant-grow { to { stroke-dashoffset: 0 } }
        .plant-pop { transform: scale(0); animation: plant-pop .5s cubic-bezier(.3,1.6,.5,1) forwards; }
        @keyframes plant-pop { to { transform: scale(1) } }
        .plant-sway { animation: plant-sway 1.4s ease-in-out infinite alternate; }
        @keyframes plant-sway { from { transform: rotate(-3deg) } to { transform: rotate(3deg) } }
      `}</style>
    </svg>
  );
}
