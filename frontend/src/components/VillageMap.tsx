import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { FN, type FnCode } from "../data/demo";
import { FN_ICON } from "./ui/FunctionIcon";

/**
 * 대시보드 마을 지도 — 죽계리 죽계상회가 문을 닫을 때 기능 4개가
 * 마을 안의 다른 자원으로 이어지는 모습을 그림으로 보여 준다.
 * 좌표는 viewBox(1000×520) 기준. 지리 정확도가 아니라 이야기 전달용 그림이다.
 */

const W = 1000;
const H = 520;
const HAND = { fontFamily: "var(--font-hand)" };

type PlaceKey = "store" | "hall" | "market" | "mart";

interface Place {
  key: PlaceKey;
  x: number;
  y: number;
  name: string;
  kind: string;
  detail: string;
  fns: FnCode[];
  labelLeft?: boolean;
}

const PLACES: Place[] = [
  { key: "store", x: 560, y: 196, name: "죽계상회", kind: "폐업 예정 · D-64", detail: "죽계리의 하나뿐인 식료품점. 주민 214명이 생필품·신선식품을 이곳에서 샀어요.", fns: ["F01", "F02", "F03", "F04"] },
  { key: "hall", x: 738, y: 132, name: "마을회관", kind: "마을 거점 · 0.2km", detail: "상시 개방. 택배 공동수령함을 두고 안부 확인 장소로 이어받아요.", fns: ["F04"] },
  { key: "market", x: 250, y: 300, name: "이동장터 정차", kind: "이동장터 3호 노선 · 0.4km", detail: "주 2회(화·금) 냉장 탑차가 정차해 생필품과 신선식품을 팔아요.", fns: ["F01", "F02"] },
  { key: "mart", x: 905, y: 52, name: "하나로마트", kind: "삼계농협 · 배달 6.8km", detail: "전화 주문하면 쌀·생수·LPG를 주 3회 집까지 배달해요.", fns: ["F03"], labelLeft: true },
];
const PLACE = Object.fromEntries(PLACES.map((p) => [p.key, p])) as Record<PlaceKey, Place>;

// 상속 후 기능 배지가 옮겨 갈 곳
const TARGET: Record<FnCode, PlaceKey> = { F01: "market", F02: "market", F03: "mart", F04: "hall" };
// 폐업 전 배지 위치 (가게 위 부채꼴)
const START_OFFSET: Record<FnCode, [number, number]> = { F01: [-120, -56], F02: [-44, -88], F03: [36, -88], F04: [140, -56] };
// 상속 후 같은 곳에 둘이 모일 때 겹치지 않게
const END_OFFSET: Record<FnCode, [number, number]> = { F01: [-30, -96], F02: [30, -96], F03: [-62, 6], F04: [0, -78] };

const ROAD = "M-30 250 C 140 262, 250 232, 380 238 S 600 292, 720 252 S 900 176, 1030 168";
const LANE = "M560 270 C 560 330, 500 380, 470 430 S 440 500, 430 560";
const BRANCH = "M800 224 C 840 170, 870 128, 905 100";
const HALL_PATH = "M738 180 C 738 210, 734 230, 730 250";
const RIVER = "M-30 380 C 120 360, 230 420, 360 436 S 600 450, 760 486 S 940 520, 1030 500";
const TRUCK_PATH = "M-60 248 C 60 256, 160 252, 262 240";
const BIKE_PATH = "M905 108 C 870 128, 840 170, 800 224 S 690 262, 610 262";

const FIELDS: { d: string; fill: string; rows?: boolean }[] = [
  { d: "M0 0 H210 L180 120 L0 140 Z", fill: "#B9D28A", rows: true },
  { d: "M210 0 H420 L390 110 L180 120 Z", fill: "#D7DC9E" },
  { d: "M0 140 L180 120 L200 205 L0 222 Z", fill: "#C9DA98", rows: true },
  { d: "M420 0 H640 L610 70 L390 110 Z", fill: "#C4D990" },
  { d: "M800 300 L1000 270 V400 L830 420 Z", fill: "#E9D58E", rows: true },
  { d: "M620 330 L800 300 L830 420 L660 440 Z", fill: "#D6E3A3", rows: true },
  { d: "M60 290 L200 280 L215 345 L70 360 Z", fill: "#DCE3A6" },
  { d: "M960 180 L1000 176 V270 L800 300 L820 250 Z", fill: "#C1D58F" },
];

const TREES: [number, number, number, string][] = [
  [228, 30, 1.1, "#7FB069"], [262, 52, 0.85, "#93C27A"], [440, 140, 1, "#6FA35B"], [470, 160, 0.75, "#8BBE73"],
  [650, 110, 0.9, "#7FB069"], [680, 96, 0.7, "#93C27A"], [850, 140, 1, "#6FA35B"], [970, 120, 1.1, "#7FB069"],
  [60, 250, 1, "#8BBE73"], [330, 320, 0.9, "#7FB069"], [380, 360, 0.8, "#93C27A"], [560, 360, 1, "#6FA35B"],
  [600, 390, 0.75, "#8BBE73"], [960, 440, 1.1, "#7FB069"], [120, 470, 1, "#6FA35B"], [300, 490, 0.9, "#8BBE73"],
  [690, 520, 0.9, "#7FB069"], [800, 70, 0.8, "#93C27A"], [520, 120, 0.7, "#8BBE73"], [20, 330, 0.9, "#7FB069"],
];

const HOUSES: [number, number, string][] = [
  [470, 205, "#D96C4E"], [640, 205, "#6F8FAF"], [420, 300, "#D96C4E"], [640, 312, "#8A9A5B"],
  [700, 300, "#D96C4E"], [360, 190, "#6F8FAF"], [880, 250, "#8A9A5B"], [130, 210, "#D96C4E"],
  [500, 312, "#6F8FAF"], [780, 340, "#D96C4E"],
];

// 주민: 처음 위치(가게로 장 보러 가는 길) → 상속 후 위치
interface Person { from: [number, number]; to?: [number, number]; shirt: string; hair: string; elder?: boolean; hat?: string }
const PEOPLE: Person[] = [
  { from: [470, 262], to: [228, 262], shirt: "#E8A33D", hair: "#3B2A20" },
  { from: [500, 272], to: [256, 274], shirt: "#5B8DB8", hair: "#D9D4CC", elder: true },
  { from: [610, 280], to: [286, 262], shirt: "#D96C4E", hair: "#3B2A20" },
  { from: [646, 270], to: [716, 196], shirt: "#8A9A5B", hair: "#E6E1D8", elder: true },
  { from: [596, 244], to: [762, 198], shirt: "#B07CC6", hair: "#5A3A28" },
  { from: [340, 252], to: [204, 258], shirt: "#F2C94C", hair: "#3B2A20" },
  { from: [900, 380], shirt: "#5B8DB8", hair: "#3B2A20", hat: "#F2D27A" },
  { from: [172, 342], shirt: "#E8735A", hair: "#3B2A20" },
  { from: [194, 350], shirt: "#6FB3C8", hair: "#5A3A28" },
  { from: [690, 412], shirt: "#E8A33D", hair: "#D9D4CC", elder: true, hat: "#F2D27A" },
];

function Tree({ x, y, s, tone }: { x: number; y: number; s: number; tone: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="3" cy="16" rx="17" ry="5" fill="#00000016" />
      <rect x="-2.5" y="2" width="5" height="14" rx="2" fill="#8B5E3C" />
      <circle cx="-9" cy="0" r="10" fill={tone} />
      <circle cx="9" cy="0" r="10" fill={tone} />
      <circle cx="0" cy="-9" r="12" fill={tone} />
      <circle cx="-4" cy="-13" r="5" fill="#ffffff2e" />
    </g>
  );
}

function House({ x, y, roof }: { x: number; y: number; roof: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="2" cy="15" rx="20" ry="5" fill="#00000016" />
      <rect x="-15" y="-3" width="30" height="18" rx="3" fill="#FFF6E6" stroke="#D8C8AC" />
      <rect x="7" y="-20" width="5" height="9" fill="#9C8366" />
      <path d="M-20 -1 Q-20 -4 -17 -6 L-3 -17 Q0 -19 3 -17 L17 -6 Q20 -4 20 -1 Z" fill={roof} />
      <rect x="-10" y="2" width="7" height="6" rx="1.5" fill="#BFE0F2" stroke="#D8C8AC" />
      <rect x="3" y="4" width="7" height="11" rx="2" fill="#B98A5E" />
    </g>
  );
}

function Flowers({ x, y }: { x: number; y: number }) {
  const dots: [number, number, string][] = [[0, 0, "#FFFFFF"], [6, 3, "#FFE27A"], [-6, 4, "#FFFFFF"], [3, -4, "#F7A8B8"], [-3, -2, "#FFFFFF"]];
  return (
    <g transform={`translate(${x} ${y})`}>
      {dots.map(([fx, fy, c], i) => <circle key={i} cx={fx} cy={fy} r="2.2" fill={c} />)}
    </g>
  );
}

function Villager({ p, at, i }: { p: Person; at: [number, number]; i: number }) {
  return (
    <g style={{ transform: `translate(${at[0]}px, ${at[1]}px)`, transition: `transform 2.4s cubic-bezier(.45,0,.25,1) ${0.15 * i}s` }}>
      <g className="villager" style={{ animationDelay: `${(i % 5) * 0.18}s` }}>
        <ellipse cx="0" cy="1" rx="7" ry="2.5" fill="#00000022" />
        <rect x="-4" y="-7" width="3" height="7" rx="1.5" fill="#4A3F35" />
        <rect x="1" y="-7" width="3" height="7" rx="1.5" fill="#4A3F35" />
        <rect x="-6" y="-18" width="12" height="13" rx="5" fill={p.shirt} />
        <circle cx="0" cy="-24" r="7" fill="#F6D2B0" />
        <path d="M-7 -24 A7 7 0 0 1 7 -24 Q4 -28 0 -27 Q-4 -28 -7 -24 Z" fill={p.hair} />
        <circle cx="-2.4" cy="-23" r="0.9" fill="#3B2A20" />
        <circle cx="2.4" cy="-23" r="0.9" fill="#3B2A20" />
        <circle cx="-4" cy="-20.5" r="1.4" fill="#F4A6A0" opacity="0.7" />
        <circle cx="4" cy="-20.5" r="1.4" fill="#F4A6A0" opacity="0.7" />
        {p.hat && <ellipse cx="0" cy="-29" rx="10" ry="3" fill={p.hat} />}
        {p.elder && <path d="M8 -14 L10 0" stroke="#8B5E3C" strokeWidth="1.6" strokeLinecap="round" />}
      </g>
    </g>
  );
}

function Pin({ place, active, closing, onEnter, onLeave, onClick }: {
  place: Place;
  active: boolean;
  closing?: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const color = closing ? "#E0402B" : "#F26B3A";
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${place.name} — ${place.kind}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="cursor-pointer outline-none"
      style={{ transform: `translate(${place.x}px, ${place.y}px)` }}
    >
      <g style={{ transform: `scale(${active ? 1.15 : 1})`, transformOrigin: "0 0", transition: "transform .2s ease" }}>
        {closing && <circle cx="0" cy="-22" r="20" fill={color} opacity="0.25" className="village-pulse" />}
        <path d="M0 0 C -9 -10, -12 -16, -12 -22 A 12 12 0 1 1 12 -22 C 12 -16, 9 -10, 0 0 Z" fill={color} stroke="#fff" strokeWidth="2" />
        <circle cx="0" cy="-22" r="4.5" fill="white" />
        <text x={place.labelLeft ? -16 : 16} y="-14" textAnchor={place.labelLeft ? "end" : "start"} fontSize="21" fontWeight="700" fill="#3A2E22" stroke="#FBF8F2" strokeWidth="5" paintOrder="stroke" style={HAND}>
          {place.name}
        </text>
      </g>
    </g>
  );
}

// 신문을 찢은 듯한 가장자리
const TORN = (() => {
  const pts: string[] = ["M0 0"];
  for (let x = 0; x <= W; x += 18) pts.push(`L${x} ${(x * 7919) % 13 < 6 ? 4 + ((x * 31) % 9) : 12 + ((x * 17) % 10)}`);
  return `${pts.join(" ")} L${W} 0 Z`;
})();

export default function VillageMap({ storeId = "store_0001" }: { storeId?: string }) {
  const navigate = useNavigate();
  const [inherited, setInherited] = useState(false);
  const [hover, setHover] = useState<PlaceKey | null>(null);
  const [run, setRun] = useState(0); // 애니메이션을 다시 시작하기 위한 key

  const store = PLACE.store;
  const shown = hover ? PLACE[hover] : null;

  const play = () => {
    setInherited(true);
    setRun((r) => r + 1);
  };

  return (
    <section className="rounded-[18px] overflow-hidden mb-8 border-[1.5px] border-ink animate-fade-up">
      {/* 머리 띠 */}
      <div className="bg-ink text-white px-10 pt-9 pb-12 flex items-end justify-between gap-10">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-white/60 tracking-wide">임실군 삼계면 죽계리 · 생활서비스 현황</p>
          <h1 className="font-display text-[40px] font-black leading-[1.22] tracking-tight mt-3">
            {inherited ? (
              <>
                가게가 하던 일 네 가지,
                <br />
                <span className="text-lime">마을이 나눠서 이어받아요</span>
              </>
            ) : (
              <>
                마을 하나뿐인 가게가
                <br />
                <span className="text-lime">문을 닫으면?</span>
              </>
            )}
          </h1>
          <div className="flex items-center gap-2 mt-6">
            {inherited ? (
              <>
                <button onClick={() => navigate(`/closures/${storeId}/inheritance`)} className="btn btn-brand">
                  상속안 자세히 보기 <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setInherited(false)} className="btn border-[1.5px] border-white/40 text-white hover:bg-white hover:text-ink">
                  <RotateCcw className="w-4 h-4" /> 처음으로
                </button>
              </>
            ) : (
              <button onClick={play} className="btn btn-brand">
                <Sparkles className="w-4 h-4" /> 기능 상속 보기
              </button>
            )}
          </div>
        </div>
        <dl className="hidden lg:flex gap-9 shrink-0 pb-1">
          {[
            ["214", "명", "영향받는 주민"],
            ["4", "개", "가게가 하던 기능"],
            [inherited ? "3" : "0", "곳", "이어받는 곳"],
          ].map(([v, u, label]) => (
            <div key={label}>
              <dd className="font-display text-[46px] font-black leading-none text-lime tnum">
                {v}
                <span className="text-[18px] text-white/80 ml-1">{u}</span>
              </dd>
              <dt className="text-[12.5px] text-white/60 mt-2">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* 지도 */}
      <div className="relative" style={{ background: "#CFE0A0" }}>
        <svg viewBox={`0 0 ${W} 22`} preserveAspectRatio="none" className="absolute left-0 top-0 w-full h-[22px] z-[1]" aria-hidden>
          <path d={TORN} fill="#121212" />
        </svg>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto select-none" role="img" aria-label="죽계리 생활서비스 마을 지도">
          <defs>
            <pattern id="rows" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
              <line x1="0" y1="0" x2="0" y2="9" stroke="#00000014" strokeWidth="3" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="#CFE0A0" />
          {FIELDS.map((f, i) => (
            <g key={i}>
              <path d={f.d} fill={f.fill} stroke="#E8EFC8" strokeWidth="4" strokeLinejoin="round" />
              {f.rows && <path d={f.d} fill="url(#rows)" />}
            </g>
          ))}
          {/* 비닐하우스 */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${250 + i * 40} ${60 + i * 6}) rotate(-14)`}>
              <rect x="-15" y="-9" width="34" height="20" rx="10" fill="#F7F7F2" stroke="#CFD3C8" />
              {[-6, 2, 10].map((lx) => <line key={lx} x1={lx} y1="-8" x2={lx} y2="10" stroke="#D9DDD3" />)}
            </g>
          ))}

          {/* 냇가 */}
          <path d={RIVER} fill="none" stroke="#E9DDBE" strokeWidth="64" strokeLinecap="round" />
          <path d={RIVER} fill="none" stroke="#7FB2DA" strokeWidth="44" strokeLinecap="round" />
          <path d={RIVER} fill="none" stroke="#ffffff99" strokeWidth="3" strokeDasharray="8 34" strokeLinecap="round" />
          <text x="610" y="478" fontSize="22" fontWeight="700" fill="#ffffff" transform="rotate(8 610 478)" style={HAND}>마을 냇가</text>

          {/* 길 */}
          {[ROAD, LANE, BRANCH, HALL_PATH].map((d, i) => (
            <g key={i}>
              <path d={d} fill="none" stroke="#E4D6B8" strokeWidth={i === 0 ? 34 : 20} strokeLinecap="round" />
              <path d={d} fill="none" stroke="#FBF3E2" strokeWidth={i === 0 ? 28 : 15} strokeLinecap="round" />
            </g>
          ))}
          <text x="380" y="226" fontSize="20" fontWeight="700" fill="#9A8466" transform="rotate(2 380 226)" style={HAND}>죽계길</text>
          {/* 다리 */}
          <g transform="translate(468 436) rotate(-30)">
            <rect x="-14" y="-34" width="28" height="68" rx="4" fill="#E07A4F" />
            <rect x="-10" y="-34" width="20" height="68" fill="#FBF3E2" />
          </g>
          {/* 만국기 */}
          <path d="M598 300 Q 690 268 792 256" fill="none" stroke="#9A8466" strokeWidth="1" />
          {Array.from({ length: 14 }, (_, i) => {
            const x = 600 + i * 14;
            const y = 299 - i * 3.1;
            const c = ["#F26B3A", "#F2C94C", "#5B8DB8", "#8BBE73"][i % 4];
            return <path key={i} d={`M${x} ${y} l10 -2 l-4 10 Z`} fill={c} />;
          })}

          {TREES.map(([x, y, s, tone], i) => <Tree key={i} x={x} y={y} s={s} tone={tone} />)}
          {HOUSES.map(([x, y, roof], i) => <House key={i} x={x} y={y} roof={roof} />)}
          {[[420, 250], [690, 230], [300, 290], [840, 200], [520, 400], [150, 300], [760, 160]].map(([x, y], i) => (
            <Flowers key={i} x={x} y={y} />
          ))}

          {/* 마을회관 */}
          <g transform={`translate(${PLACE.hall.x} ${PLACE.hall.y + 34})`}>
            <ellipse cx="2" cy="18" rx="42" ry="7" fill="#00000016" />
            <rect x="-34" y="-6" width="68" height="24" rx="3" fill="#F3A46B" stroke="#D88A55" />
            <rect x="-38" y="-14" width="76" height="10" rx="3" fill="#4E9C6B" />
            {[-26, -14, 8, 20].map((wx) => <rect key={wx} x={wx} y="0" width="8" height="7" rx="1" fill="#E9F4FA" />)}
            <rect x="-5" y="4" width="10" height="14" fill="#9C7150" />
          </g>
          {/* 하나로마트 */}
          <g transform={`translate(${PLACE.mart.x} ${PLACE.mart.y + 34})`}>
            <ellipse cx="2" cy="18" rx="40" ry="7" fill="#00000016" />
            <rect x="-32" y="-6" width="64" height="24" rx="3" fill="#FFFFFF" stroke="#D6DDD0" />
            <rect x="-34" y="-14" width="68" height="11" rx="3" fill="#2E9C5B" />
            <text x="0" y="-5.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="white">하나로마트</text>
            <rect x="-9" y="5" width="18" height="13" fill="#BFE0F2" />
          </g>
          {/* 죽계상회 (폐업 예정 → 회색) */}
          <g transform={`translate(${store.x} ${store.y + 34})`}>
            <g style={{ filter: inherited ? "grayscale(1)" : "none", transition: "filter .9s" }}>
              <ellipse cx="2" cy="18" rx="36" ry="7" fill="#00000018" />
              <rect x="-28" y="-6" width="56" height="24" rx="3" fill="#FFF6E6" stroke="#D8C8AC" />
              <path d="M-32 -8 H32 L28 3 H-28 Z" fill="#E0402B" />
              {[-24, -12, 0, 12, 24].map((sx) => <path key={sx} d={`M${sx - 4} -8 h6 l-1 11 h-6 Z`} fill="#FFFFFF" />)}
              <rect x="-22" y="7" width="12" height="8" rx="1" fill="#F2C94C" />
              <rect x="-6" y="5" width="13" height="13" fill="#B98A5E" />
              <rect x="12" y="7" width="10" height="8" rx="1" fill="#8BBE73" />
            </g>
            <g transform="translate(30 8) rotate(10)">
              <rect x="0" y="-2" width="44" height="17" rx="2" fill="#FFFFFF" stroke="#E0402B" strokeWidth="1.5" />
              <text x="22" y="11" textAnchor="middle" fontSize="13" fontWeight="700" fill="#E0402B" style={HAND}>폐업 예정</text>
            </g>
          </g>

          {/* 상속 경로 */}
          {inherited &&
            (["market", "mart", "hall"] as PlaceKey[]).map((k) => {
              const t = PLACE[k];
              const code = (Object.keys(TARGET) as FnCode[]).find((f) => TARGET[f] === k) ?? "F01";
              return (
                <path
                  key={`${run}-${k}`}
                  d={`M${store.x} ${store.y - 40} Q ${(store.x + t.x) / 2} ${Math.min(store.y, t.y) - 110} ${t.x} ${t.y - 50}`}
                  fill="none"
                  stroke={FN[code].hex}
                  strokeWidth="3"
                  strokeDasharray="2 9"
                  strokeLinecap="round"
                  className="village-flow"
                />
              );
            })}

          {/* 이동장터 트럭 */}
          {inherited && (
            <g key={`truck-${run}`}>
              <g>
                <rect x="-26" y="-22" width="36" height="22" rx="5" fill="#F2C94C" stroke="#C99A1E" />
                <path d="M-24 -22 h32 l-3 -6 h-26 Z" fill="#F26B3A" />
                <rect x="10" y="-15" width="16" height="15" rx="5" fill="#FFF6E6" stroke="#C99A1E" />
                <rect x="14" y="-12" width="8" height="5" rx="1.5" fill="#BFE0F2" />
                <circle cx="-15" cy="1" r="5" fill="#3A3A3A" />
                <circle cx="16" cy="1" r="5" fill="#3A3A3A" />
                <text x="-8" y="-7" textAnchor="middle" fontSize="10" fontWeight="700" fill="#7A5A14" style={HAND}>장터</text>
                <animateMotion path={TRUCK_PATH} dur="2.4s" fill="freeze" calcMode="spline" keySplines="0.2 0.7 0.2 1" keyTimes="0;1" />
              </g>
            </g>
          )}
          {/* 하나로마트 배달 오토바이 */}
          {inherited && (
            <g key={`bike-${run}`}>
              <g>
                <rect x="-11" y="-14" width="13" height="10" rx="2" fill="#2E9C5B" />
                <path d="M-8 -3 H8 L10 -10" stroke="#3A3A3A" strokeWidth="2" fill="none" />
                <circle cx="-8" cy="0" r="3.6" fill="#3A3A3A" />
                <circle cx="8" cy="0" r="3.6" fill="#3A3A3A" />
                <circle cx="5" cy="-17" r="4.5" fill="#F6D2B0" />
                <path d="M0.5 -17 A4.5 4.5 0 0 1 9.5 -17 Z" fill="#E0402B" />
                <animateMotion path={BIKE_PATH} dur="3s" begin="0.5s" fill="freeze" calcMode="spline" keySplines="0.3 0.6 0.3 1" keyTimes="0;1" />
              </g>
            </g>
          )}

          {/* 주민 */}
          {PEOPLE.map((p, i) => (
            <Villager key={i} p={p} i={i} at={inherited && p.to ? p.to : p.from} />
          ))}

          {/* 기능 배지 */}
          {(Object.keys(START_OFFSET) as FnCode[]).map((c, i) => {
            const target = PLACE[TARGET[c]];
            const from = START_OFFSET[c];
            const to = END_OFFSET[c];
            const x = inherited ? target.x + to[0] : store.x + from[0];
            const y = inherited ? target.y + to[1] : store.y + from[1];
            const Icon = FN_ICON[c];
            return (
              <g
                key={c}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: `transform 1.4s cubic-bezier(.5,0,.2,1) ${inherited ? 0.3 + i * 0.2 : 0}s`,
                }}
              >
                <circle r="19" fill="#FBF8F2" stroke="#121212" strokeWidth="2" />
                <circle r="14" fill={`${FN[c].hex}26`} />
                <Icon x={-9} y={-9} width={18} height={18} color={FN[c].hex} strokeWidth={2.4} />
                <text y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#121212" stroke="#FBF8F2" strokeWidth="4" paintOrder="stroke" style={HAND}>
                  {FN[c].short}
                </text>
              </g>
            );
          })}

          {/* 장소 핀 */}
          {PLACES.map((p) => (
            <Pin
              key={p.key}
              place={p}
              active={hover === p.key}
              closing={p.key === "store"}
              onEnter={() => setHover(p.key)}
              onLeave={() => setHover((h) => (h === p.key ? null : h))}
              onClick={() => navigate(p.key === "store" ? `/closures/${storeId}/functions` : `/closures/${storeId}/inheritance`)}
            />
          ))}
        </svg>

        {/* 핀 설명 말풍선 */}
        {shown && (
          <div
            className="absolute z-10 w-[250px] -translate-x-1/2 rounded-xl bg-surface border-[1.5px] border-ink px-4 py-3 shadow-[4px_4px_0_#121212] pointer-events-none animate-scale-in"
            style={{ left: `${(shown.x / W) * 100}%`, top: `calc(${(shown.y / H) * 100}% + 14px)` }}
          >
            <p className="font-display text-[15px] font-bold">{shown.name}</p>
            <p className={`text-[11.5px] font-semibold ${shown.key === "store" ? "text-[#E0402B]" : "text-brand"}`}>{shown.kind}</p>
            <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed">{shown.detail}</p>
            <div className="flex gap-1 mt-2">
              {shown.fns.map((c) => (
                <span key={c} className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: FN[c].hex }}>
                  {FN[c].short}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="absolute right-5 bottom-4 text-[11px] text-ink/60 bg-surface/80 px-2.5 py-1 rounded-full">
          그림 지도 · 실제 위치와 다를 수 있어요
        </p>
      </div>

      <style>{`
        .village-pulse { animation: village-pulse 1.8s ease-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes village-pulse { from { transform: scale(.6); opacity: .55 } to { transform: scale(1.7); opacity: 0 } }
        .village-flow { animation: village-flow 1s linear infinite, fade-in .6s ease both; }
        @keyframes village-flow { to { stroke-dashoffset: -22 } }
        .villager { animation: villager-bob .9s ease-in-out infinite alternate; }
        @keyframes villager-bob { to { transform: translateY(-1.6px) } }
      `}</style>
    </section>
  );
}
