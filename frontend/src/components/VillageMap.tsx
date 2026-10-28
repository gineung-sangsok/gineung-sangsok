import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { FN, type FnCode } from "../data/demo";
import { FN_ICON } from "./ui/FunctionIcon";

/**
 * 대시보드 마을 지도 — 죽계리 죽계상회가 문을 닫을 때 기능 4개가
 * 마을 안의 다른 자원으로 이어지는 모습을 그림으로 보여 준다.
 * 좌표는 viewBox(1000×460) 기준. 지리 정확도가 아니라 이야기 전달용 그림이다.
 */

const W = 1000;
const H = 460;

type PlaceKey = "store" | "hall" | "market" | "mart";

interface Place {
  key: PlaceKey;
  x: number;
  y: number;
  name: string;
  kind: string;
  detail: string;
  fns: FnCode[];
}

const PLACES: Place[] = [
  { key: "store", x: 505, y: 236, name: "죽계상회", kind: "폐업 예정 · D-64", detail: "죽계리의 하나뿐인 식료품점. 주민 214명이 생필품·신선식품을 이곳에서 샀어요.", fns: ["F01", "F02", "F03", "F04"] },
  { key: "hall", x: 690, y: 176, name: "죽계리 마을회관", kind: "마을 거점 · 0.2km", detail: "상시 개방. 택배 공동수령함을 두고 안부 확인 장소로 이어받아요.", fns: ["F04"] },
  { key: "market", x: 372, y: 318, name: "이동장터 정차 지점", kind: "이동장터 3호 노선 · 0.4km", detail: "주 2회(화·금) 냉장 탑차가 정차해 생필품과 신선식품을 팔아요.", fns: ["F01", "F02"] },
  { key: "mart", x: 880, y: 92, name: "삼계농협 하나로마트", kind: "배달 · 6.8km", detail: "전화 주문하면 쌀·생수·LPG를 주 3회 집까지 배달해요.", fns: ["F03"] },
];
const PLACE = Object.fromEntries(PLACES.map((p) => [p.key, p])) as Record<PlaceKey, Place>;

// 상속 후 기능 배지가 옮겨 갈 곳
const TARGET: Record<FnCode, PlaceKey> = { F01: "market", F02: "market", F03: "mart", F04: "hall" };
// 폐업 전 배지 위치 (가게 위 부채꼴)
const START_OFFSET: Record<FnCode, [number, number]> = { F01: [-100, -64], F02: [-36, -100], F03: [36, -100], F04: [100, -64] };
// 상속 후 같은 곳에 둘이 모일 때 겹치지 않게
const END_OFFSET: Record<FnCode, [number, number]> = { F01: [-30, -78], F02: [30, -78], F03: [0, -78], F04: [0, -78] };

const ROAD = "M-20 392 C 120 372, 210 340, 300 330 S 430 300, 505 270 S 640 210, 690 196 S 820 130, 1020 70";
const LANE = "M505 270 C 520 320, 560 360, 640 380 S 820 400, 1020 380";
const RIVER = "M-20 150 C 90 170, 160 120, 250 135 S 380 205, 330 250 S 170 300, 120 360 S 70 440, 90 480";
const TRUCK_PATH = "M-40 396 C 120 372, 210 340, 300 330 S 340 322, 360 320";
const VAN_PATH = "M880 112 C 820 130, 760 160, 700 196 S 580 236, 540 252";

const FIELDS: { d: string; fill: string }[] = [
  { d: "M0 0 H240 L205 95 L0 120 Z", fill: "#CBD9A2" },
  { d: "M240 0 H520 L480 120 L205 95 Z", fill: "#DCE4B6" },
  { d: "M520 0 H760 L700 70 L480 120 Z", fill: "#C3D598" },
  { d: "M760 0 H1000 V40 L840 60 L700 70 Z", fill: "#D5E0AA" },
  { d: "M380 300 L470 290 L520 360 L420 380 Z", fill: "#E6DDA8" },
  { d: "M520 360 L620 340 L660 420 L540 440 Z", fill: "#CFDDA6" },
  { d: "M700 260 L830 240 L860 320 L720 340 Z", fill: "#E3E0B0" },
  { d: "M840 180 L1000 150 V290 L870 300 Z", fill: "#C6D79E" },
  { d: "M660 420 L800 400 L820 460 H660 Z", fill: "#DCE4B6" },
  { d: "M830 330 L1000 320 V460 H840 Z", fill: "#CBD9A2" },
];

const TREES: [number, number, number][] = [
  [60, 210, 16], [92, 228, 12], [180, 210, 14], [420, 150, 15], [452, 168, 11], [600, 120, 14],
  [628, 140, 10], [780, 120, 13], [960, 200, 15], [930, 228, 11], [740, 300, 12], [600, 300, 13],
  [200, 420, 15], [240, 440, 11], [470, 420, 13], [980, 420, 14], [560, 196, 10], [360, 230, 12],
];

const HOUSES: [number, number, string][] = [
  [430, 250, "#D9735B"], [560, 296, "#7E8FA3"], [585, 250, "#5B8DB8"], [470, 300, "#D9735B"],
  [640, 250, "#D9735B"], [760, 214, "#7E8FA3"], [400, 205, "#5B8DB8"], [540, 330, "#7E8FA3"],
];

function House({ x, y, roof, grey = false }: { x: number; y: number; roof: string; grey?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={grey ? 0.9 : 1}>
      <ellipse cx="0" cy="13" rx="17" ry="4" fill="#00000014" />
      <rect x="-13" y="-4" width="26" height="17" rx="2" fill={grey ? "#E8E8E6" : "#FFF8EC"} stroke="#E3D6BF" />
      <path d="M-17 -3 L0 -16 L17 -3 Z" fill={grey ? "#A9AEB4" : roof} />
      <rect x="-3.5" y="4" width="7" height="9" rx="1" fill={grey ? "#B9BDC2" : "#C9A27A"} />
    </g>
  );
}

function Tree({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <ellipse cx={x + 3} cy={y + r * 0.9} rx={r * 0.9} ry={r * 0.3} fill="#00000012" />
      <circle cx={x} cy={y} r={r} fill="#8DB86F" />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.45} fill="#A6CB86" />
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
  const color = closing ? "#E0604E" : "#1F6FE5";
  const labelW = place.name.length * 13 + 22;
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
      <g style={{ transform: `scale(${active ? 1.12 : 1})`, transformOrigin: "0 0", transition: "transform .2s ease" }}>
        {closing && <circle cx="0" cy="-26" r="22" fill={color} opacity="0.18" className="village-pulse" />}
        <path d="M0 0 C -10 -12, -14 -18, -14 -26 A 14 14 0 1 1 14 -26 C 14 -18, 10 -12, 0 0 Z" fill={color} stroke="white" strokeWidth="2.5" />
        <circle cx="0" cy="-26" r="5.5" fill="white" />
        <g transform={`translate(${-labelW / 2} 8)`}>
          <rect width={labelW} height="24" rx="12" fill="white" stroke={active ? color : "#E3D6BF"} strokeWidth="1.5" />
          <text x={labelW / 2} y="16.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#13253D">
            {place.name}
          </text>
        </g>
      </g>
    </g>
  );
}

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
    <section className="relative overflow-hidden rounded-[28px] mb-6 border border-[#E3D6BF] animate-fade-up" style={{ background: "#E9EDD2" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto select-none" role="img" aria-label="죽계리 생활서비스 마을 지도">
        {/* 들판 */}
        <rect width={W} height={H} fill="#E9EDD2" />
        {FIELDS.map((f, i) => (
          <path key={i} d={f.d} fill={f.fill} stroke="#F4F1DE" strokeWidth="3" />
        ))}
        {/* 비닐하우스 */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={735 + i * 24} y={262 + i * -3} width="18" height="48" rx="9" fill="#F3F6F4" stroke="#D5DED8" transform={`rotate(-12 ${744 + i * 24} 286)`} />
        ))}
        {/* 강 */}
        <path d={RIVER} fill="none" stroke="#D3E6F2" strokeWidth="46" strokeLinecap="round" />
        <path d={RIVER} fill="none" stroke="#93C0DF" strokeWidth="30" strokeLinecap="round" />
        <path d={RIVER} fill="none" stroke="#B5D5EA" strokeWidth="4" strokeDasharray="2 22" strokeLinecap="round" />
        {/* 길 */}
        <path d={ROAD} fill="none" stroke="#EADDC2" strokeWidth="30" strokeLinecap="round" />
        <path d={ROAD} fill="none" stroke="#FAF3E3" strokeWidth="24" strokeLinecap="round" />
        <path d={LANE} fill="none" stroke="#EADDC2" strokeWidth="18" strokeLinecap="round" />
        <path d={LANE} fill="none" stroke="#FAF3E3" strokeWidth="13" strokeLinecap="round" />
        {/* 다리 */}
        <rect x="262" y="318" width="54" height="26" rx="4" fill="#C9A27A" transform="rotate(-18 289 331)" />

        {TREES.map(([x, y, r], i) => <Tree key={i} x={x} y={y} r={r} />)}
        {HOUSES.map(([x, y, roof], i) => <House key={i} x={x} y={y} roof={roof} />)}

        {/* 마을회관 */}
        <g transform={`translate(${PLACE.hall.x} ${PLACE.hall.y + 30})`}>
          <ellipse cx="0" cy="18" rx="34" ry="6" fill="#00000014" />
          <rect x="-26" y="-4" width="52" height="22" rx="2" fill="#FFF8EC" stroke="#E3D6BF" />
          <path d="M-34 -2 Q0 -26 34 -2 Z" fill="#5E6E7E" />
          <rect x="-6" y="6" width="12" height="12" fill="#C9A27A" />
        </g>
        {/* 하나로마트 */}
        <g transform={`translate(${PLACE.mart.x} ${PLACE.mart.y + 30})`}>
          <ellipse cx="0" cy="18" rx="36" ry="6" fill="#00000014" />
          <rect x="-30" y="-6" width="60" height="24" rx="3" fill="#FFFFFF" stroke="#D6E2EE" />
          <rect x="-30" y="-10" width="60" height="9" rx="3" fill="#2E9C5B" />
          <rect x="-8" y="6" width="16" height="12" fill="#BFD9F2" />
        </g>
        {/* 죽계상회 (폐업 예정 → 회색) */}
        <g transform={`translate(${store.x} ${store.y + 30})`}>
          <ellipse cx="0" cy="18" rx="32" ry="6" fill="#00000016" />
          <rect x="-26" y="-6" width="52" height="24" rx="3" fill={inherited ? "#ECECEA" : "#FFF8EC"} stroke="#E3D6BF" style={{ transition: "fill .8s" }} />
          <path d="M-30 -6 H30 L26 2 H-26 Z" fill={inherited ? "#B7BBC0" : "#E0604E"} style={{ transition: "fill .8s" }} />
          {[-20, -10, 0, 10, 20].map((sx) => (
            <rect key={sx} x={sx - 3} y="-6" width="5" height="8" fill="#ffffff55" />
          ))}
          <rect x="-8" y="6" width="16" height="12" fill={inherited ? "#C6C9CC" : "#C9A27A"} style={{ transition: "fill .8s" }} />
          <g transform="translate(30 4) rotate(8)">
            <rect x="-2" y="-2" width="44" height="18" rx="3" fill="#FFFFFF" stroke="#E0604E" strokeWidth="1.5" />
            <text x="20" y="11" textAnchor="middle" fontSize="9" fontWeight="800" fill="#E0604E">폐업 예정</text>
          </g>
        </g>

        {/* 상속 경로 */}
        {inherited &&
          (Object.keys(TARGET) as FnCode[]).filter((c, i, a) => a.findIndex((k) => TARGET[k] === TARGET[c]) === i).map((c) => {
            const t = PLACE[TARGET[c]];
            return (
              <path
                key={`${run}-${c}`}
                d={`M${store.x} ${store.y - 20} Q ${(store.x + t.x) / 2} ${Math.min(store.y, t.y) - 90} ${t.x} ${t.y - 40}`}
                fill="none"
                stroke={FN[c].hex}
                strokeWidth="2.5"
                strokeDasharray="6 7"
                className="village-flow"
              />
            );
          })}

        {/* 이동장터 트럭 */}
        {inherited && (
          <g key={`truck-${run}`}>
            <g>
              <rect x="-20" y="-14" width="28" height="18" rx="3" fill="#FFFFFF" stroke="#2B8FF0" strokeWidth="1.5" />
              <rect x="8" y="-8" width="13" height="12" rx="3" fill="#2B8FF0" />
              <circle cx="-12" cy="5" r="4" fill="#38475A" />
              <circle cx="13" cy="5" r="4" fill="#38475A" />
              <animateMotion path={TRUCK_PATH} dur="2.2s" fill="freeze" rotate="auto" calcMode="spline" keySplines="0.2 0.7 0.2 1" keyTimes="0;1" />
            </g>
          </g>
        )}
        {/* 하나로마트 배달 오토바이 */}
        {inherited && (
          <g key={`van-${run}`}>
            <g>
              <rect x="-10" y="-9" width="14" height="10" rx="2" fill="#2E9C5B" />
              <circle cx="-7" cy="3" r="3.2" fill="#38475A" />
              <circle cx="7" cy="3" r="3.2" fill="#38475A" />
              <path d="M4 -4 H10 L8 1" stroke="#38475A" strokeWidth="2" fill="none" />
              <animateMotion path={VAN_PATH} dur="2.8s" begin="0.4s" fill="freeze" calcMode="spline" keySplines="0.3 0.6 0.3 1" keyTimes="0;1" />
            </g>
          </g>
        )}

        {/* 기능 배지 */}
        {(Object.keys(START_OFFSET) as FnCode[]).map((c, i) => {
          const from = START_OFFSET[c];
          const target = PLACE[TARGET[c]];
          const to = END_OFFSET[c];
          const x = inherited ? target.x + to[0] : store.x + from[0];
          const y = inherited ? target.y + to[1] : store.y + from[1];
          const Icon = FN_ICON[c];
          return (
            <g
              key={c}
              style={{
                transform: `translate(${x}px, ${y}px)`,
                transition: `transform 1.3s cubic-bezier(.5,0,.2,1) ${inherited ? 0.25 + i * 0.18 : 0}s`,
              }}
            >
              <circle r="17" fill="white" stroke={FN[c].hex} strokeWidth="2.5" />
              <Icon x={-9} y={-9} width={18} height={18} color={FN[c].hex} strokeWidth={2.3} />
              <text y="31" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={FN[c].hex} stroke="white" strokeWidth="3" paintOrder="stroke">
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

        {/* 제목 리본 */}
        <g transform="translate(680 404)">
          <path d="M0 8 H300 L288 26 L300 44 H0 L12 26 Z" fill="#F2D27A" />
          <text x="150" y="32" textAnchor="middle" fontSize="16" fontWeight="800" fill="#7A5A14">죽계리 생활지도</text>
        </g>
      </svg>

      {/* 안내 카드 */}
      <div className="absolute left-5 top-5 w-[310px] rounded-[22px] bg-white/92 backdrop-blur px-6 py-5 shadow-[var(--shadow-lift)]">
        <p className="text-[12px] font-bold text-action">삼계면 죽계리 · 주민 214명</p>
        <h1 className="text-[22px] font-extrabold leading-[1.3] tracking-tight mt-1">
          {inherited ? (
            <>
              죽계상회의 기능 4개가
              <br />
              <span className="text-action">마을 안에서 이어져요</span>
            </>
          ) : (
            <>
              마을 하나뿐인 가게가
              <br />
              <span className="text-[#E0604E]">문을 닫으면?</span>
            </>
          )}
        </h1>
        <p className="text-[13px] text-text-secondary mt-2">
          {inherited ? "이동장터·마을회관·농협 배달이 나눠서 맡아요. 핀을 눌러 자세히 보세요." : "생필품부터 안부 확인까지, 가게가 하던 일을 누가 이어받을지 확인해 보세요."}
        </p>
        <div className="flex items-center gap-2 mt-4">
          {inherited ? (
            <>
              <button onClick={() => navigate(`/closures/${storeId}/inheritance`)} className="btn btn-primary btn-sm">
                상속안 자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setInherited(false)} className="btn btn-ghost btn-sm">
                <RotateCcw className="w-3.5 h-3.5" /> 처음으로
              </button>
            </>
          ) : (
            <button onClick={play} className="btn btn-primary btn-sm">
              <Sparkles className="w-3.5 h-3.5" /> 기능 상속 보기
            </button>
          )}
        </div>
      </div>

      {/* 핀 설명 말풍선 */}
      {shown && (
        <div
          className="absolute z-10 w-[250px] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-pop)] pointer-events-none animate-scale-in"
          style={{ left: `${(shown.x / W) * 100}%`, top: `calc(${(shown.y / H) * 100}% + 46px)` }}
        >
          <p className="text-[14px] font-bold">{shown.name}</p>
          <p className={`text-[11.5px] font-semibold ${shown.key === "store" ? "text-[#E0604E]" : "text-action"}`}>{shown.kind}</p>
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

      <style>{`
        .village-pulse { animation: village-pulse 1.8s ease-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes village-pulse { from { transform: scale(.6); opacity: .5 } to { transform: scale(1.6); opacity: 0 } }
        .village-flow { animation: village-flow 1s linear infinite, fade-in .6s ease both; }
        @keyframes village-flow { to { stroke-dashoffset: -26 } }
      `}</style>
    </section>
  );
}
