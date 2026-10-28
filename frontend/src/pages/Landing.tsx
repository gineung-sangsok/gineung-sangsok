import { useNavigate } from "react-router-dom";
import { ArrowRight, Map as MapIcon, Sprout } from "lucide-react";
import { FACILITIES, FN, FUNCTIONS, FUNCTION_GAP_RATE, type FnCode } from "../data/demo";
import FunctionIcon, { FN_ICON } from "../components/ui/FunctionIcon";
import { House, Tree, Villager, type Person } from "../components/VillageMap";

/**
 * 첫 화면 — 천천히 도는 작은 마을 행성 위로 나무 한 그루가 자라고,
 * 가게가 하던 일 네 가지가 열매처럼 열린다.
 * 행성 원본 좌표는 (500, 400, r250)이고 히어로 그림 안에서 줄여 쓴다.
 */

const CX = 500;
const CY = 400;
const R = 250;

// 히어로 그림(700×700) 안에서 행성 위치
const PX = 350;
const PY = 450;
const K = 0.64;
const TOP = PY - R * K; // 행성 꼭대기

// 행성 둘레에 서 있는 것들 (각도는 12시 방향이 0°, 꼭대기 나무 자리는 비운다)
const RIM: { a: number; kind: "tree" | "house" | "store" | "person"; tone?: string; p?: Person }[] = [
  { a: 40, kind: "house", tone: "#D96C4E" },
  { a: 56, kind: "tree", tone: "#7FB069" },
  { a: 72, kind: "person", p: { from: [0, 0], shirt: "#E8A33D", hair: "#3B2A20" } },
  { a: 90, kind: "store" },
  { a: 110, kind: "tree", tone: "#6FA35B" },
  { a: 130, kind: "house", tone: "#6F8FAF" },
  { a: 146, kind: "person", p: { from: [0, 0], shirt: "#5B8DB8", hair: "#D9D4CC", elder: true } },
  { a: 164, kind: "tree", tone: "#8BBE73" },
  { a: 184, kind: "house", tone: "#8A9A5B" },
  { a: 204, kind: "tree", tone: "#7FB069" },
  { a: 222, kind: "person", p: { from: [0, 0], shirt: "#D96C4E", hair: "#3B2A20", hat: "#F2D27A" } },
  { a: 240, kind: "house", tone: "#D96C4E" },
  { a: 262, kind: "tree", tone: "#6FA35B" },
  { a: 284, kind: "house", tone: "#6F8FAF" },
  { a: 300, kind: "tree", tone: "#93C27A" },
  { a: 316, kind: "person", p: { from: [0, 0], shirt: "#B07CC6", hair: "#5A3A28" } },
];

// 행성 표면의 논밭 조각
const PATCHES: { d: string; fill: string }[] = [
  { d: "M250 300 Q 330 220 450 240 L 430 330 Q 330 340 260 380 Z", fill: "#B9D28A" },
  { d: "M450 240 Q 560 200 660 250 L 620 340 L 430 330 Z", fill: "#D7DC9E" },
  { d: "M660 250 Q 730 300 748 380 L 640 400 L 620 340 Z", fill: "#C4D990" },
  { d: "M260 380 Q 330 340 430 330 L 440 450 L 262 470 Z", fill: "#E9D58E" },
  { d: "M620 340 L 640 400 L 748 380 Q 750 470 700 540 L 600 470 Z", fill: "#B9D28A" },
  { d: "M262 470 L 440 450 L 470 600 Q 330 600 280 540 Z", fill: "#C9DA98" },
  { d: "M440 450 L 600 470 L 700 540 Q 620 640 470 650 Z", fill: "#D6E3A3" },
];

// 꼭대기 나무: 잎 덩어리(나중에 자라는 순서대로)와 열매(기능)
const CANOPY: [number, number, number, string][] = [
  [0, -150, 62, "#8BC48A"], [-58, -118, 50, "#7DB97E"], [58, -118, 50, "#7DB97E"],
  [-38, -186, 44, "#9ACF95"], [40, -188, 44, "#9ACF95"], [0, -96, 44, "#74B276"],
];
const FRUITS: { code: FnCode; x: number; y: number }[] = [
  { code: "F01", x: -62, y: -128 },
  { code: "F02", x: 2, y: -200 },
  { code: "F03", x: 64, y: -132 },
  { code: "F04", x: 6, y: -104 },
];
const CLOUDS: [number, number, number][] = [[110, 120, 1], [560, 90, 0.8], [600, 300, 0.65]];
const ORBIT = `M ${PX - 250} ${PY + 20} A 250 64 -8 1 0 ${PX + 250} ${PY - 50} A 250 64 -8 1 0 ${PX - 250} ${PY + 20}`;

function rimTransform(a: number) {
  return `rotate(${a} ${CX} ${CY}) translate(${CX} ${CY - R + 4})`;
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="hero-cloud">
        <ellipse cx="0" cy="0" rx="46" ry="22" fill="#FFFFFF" />
        <circle cx="-18" cy="-12" r="20" fill="#FFFFFF" />
        <circle cx="14" cy="-18" r="24" fill="#FFFFFF" />
      </g>
    </g>
  );
}

function GrowingTree() {
  return (
    <g transform={`translate(${PX} ${TOP + 6})`}>
      {/* 줄기와 가지 */}
      <g className="grow-trunk">
        <path d="M-9 0 C -8 -40, -6 -70, -4 -104 L 4 -104 C 6 -70, 8 -40, 9 0 Z" fill="#9C6B45" />
        <path d="M-3 -62 C -20 -76, -36 -84, -52 -100" stroke="#9C6B45" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M3 -70 C 20 -84, 36 -92, 50 -106" stroke="#9C6B45" strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
      {/* 잎 */}
      {CANOPY.map(([x, y, r, c], i) => (
        <g key={i} className="grow-leaf" style={{ animationDelay: `${0.9 + i * 0.14}s`, transformOrigin: `${x}px ${y}px` }}>
          <circle cx={x} cy={y} r={r} fill={c} />
          <circle cx={x - r * 0.3} cy={y - r * 0.32} r={r * 0.35} fill="#ffffff33" />
        </g>
      ))}
      {/* 열매 = 가게가 하던 기능 */}
      {FRUITS.map((f, i) => {
        const Icon = FN_ICON[f.code];
        return (
          <g key={f.code} className="grow-fruit" style={{ animationDelay: `${2 + i * 0.22}s`, transformOrigin: `${f.x}px ${f.y}px` }}>
            <g className="fruit-sway" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${f.x}px ${f.y - 18}px` }}>
              <path d={`M${f.x} ${f.y - 17} q 6 -8 12 -6`} stroke="#5E8C4A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx={f.x} cy={f.y} r="18" fill={FN[f.code].hex} stroke="#FFFFFF" strokeWidth="3" />
              <Icon x={f.x - 9} y={f.y - 9} width={18} height={18} color={FN[f.code].deep} strokeWidth={2.4} />
            </g>
          </g>
        );
      })}
      {/* 나무 곁의 주민 */}
      <g transform="translate(-44 0) scale(1.35)">
        <Villager p={{ from: [0, 0], shirt: "#E8A33D", hair: "#D9D4CC", elder: true }} at={[0, 0]} i={1} />
      </g>
      <g transform="translate(46 0) scale(1.25)">
        <Villager p={{ from: [0, 0], shirt: "#A9CDE6", hair: "#3B2A20", hat: "#F2D27A" }} at={[0, 0]} i={3} />
      </g>
    </g>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const closing = FACILITIES.filter((f) => f.status === "CLOSING").length;
  const pop = FACILITIES.filter((f) => f.status !== "ACTIVE").reduce((a, f) => a + f.affected_pop, 0);

  return (
    <div className="h-full overflow-y-auto thin-scroll">
      {/* 상단 */}
      <header className="max-w-[1280px] mx-auto px-8 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-ink text-sage flex items-center justify-center">
            <MapIcon className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[17px] font-extrabold tracking-[0.08em]">CLOSER</span>
            <span className="block text-[11px] font-semibold text-text-muted mt-0.5">더 가까이</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-[14px] font-semibold">
          <a href="#about" className="hover:underline underline-offset-4">서비스 소개</a>
          <a href="#how" className="hover:underline underline-offset-4">이어받는 방법</a>
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary btn-sm">
            시작하기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 히어로: 나무가 자라는 마을 행성 */}
      <section className="max-w-[1280px] mx-auto px-8">
        <div
          className="relative overflow-hidden rounded-[36px] grid grid-cols-12 items-center min-h-[620px]"
          style={{ background: "radial-gradient(120% 90% at 80% 20%, #FFFFFF 0%, #EAF6EC 45%, #DCEFE0 100%)" }}
        >
          <div className="absolute -left-24 -bottom-28 w-[380px] h-[380px] rounded-full bg-[#F7E7B6]/50" />
          <div className="absolute left-[38%] -top-20 w-[220px] h-[220px] rounded-full bg-[#F8D3C4]/40" />

          <div className="relative col-span-5 pl-14 pr-4 py-16">
            <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white/80 text-[12.5px] font-semibold text-brand">
              <Sprout className="w-4 h-4" /> 농촌 생활서비스 기능 상속 플랫폼
            </span>
            <h1 className="font-display font-extrabold tracking-[-0.04em] leading-[0.9] text-[#2F5E43] text-[clamp(84px,9vw,132px)] mt-6">
              Closer<span className="text-[#F5A68A]">.</span>
            </h1>
            <p className="text-[26px] font-bold mt-4">더 가까이</p>
            <p className="text-[16px] text-text-secondary leading-relaxed mt-3 max-w-[400px]">
              마을 하나뿐인 가게가 문을 닫아도, 가게가 하던 일은 마을 안에서 다시 자라요.
            </p>
            <div className="flex items-center gap-2 mt-8">
              <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
                대시보드 들어가기 <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/closures/new")} className="btn btn-ghost">
                폐업 예정 시설 등록
              </button>
            </div>
            <div className="flex items-center gap-2 mt-10">
              {FUNCTIONS.map((f) => (
                <span key={f.code} className="flex items-center gap-1.5 h-9 pl-1 pr-3 rounded-full bg-white/80 text-[12.5px] font-semibold">
                  <FunctionIcon code={f.code} size={28} /> {f.short}
                </span>
              ))}
            </div>
          </div>

          <div className="relative col-span-7 h-full">
            <svg viewBox="0 0 700 700" className="w-full h-full max-h-[680px] select-none" aria-hidden>
              <defs>
                <clipPath id="planet">
                  <circle cx={CX} cy={CY} r={R} />
                </clipPath>
                <radialGradient id="shade" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="100%" stopColor="#2F5E43" stopOpacity="0.22" />
                </radialGradient>
              </defs>

              {CLOUDS.map(([x, y, s], i) => <Cloud key={i} x={x} y={y} s={s} />)}

              {/* 이동장터 트럭이 도는 궤도 (뒤쪽 절반) */}
              <path d={ORBIT} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />

              {/* 돌아가는 행성 */}
              <ellipse cx={PX} cy={PY + R * K + 18} rx={R * K * 0.8} ry="16" fill="#2F5E43" opacity="0.08" />
              <g transform={`translate(${PX - CX * K} ${PY - CY * K}) scale(${K})`}>
                <g>
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`360 ${CX} ${CY}`} dur="140s" repeatCount="indefinite" />
                  <g clipPath="url(#planet)">
                    <circle cx={CX} cy={CY} r={R} fill="#CFE0A0" />
                    {PATCHES.map((p, i) => (
                      <path key={i} d={p.d} fill={p.fill} stroke="#E8EFC8" strokeWidth="5" strokeLinejoin="round" />
                    ))}
                    <path d="M220 520 C 340 470, 420 560, 540 520 S 720 430, 790 470" fill="none" stroke="#E9DDBE" strokeWidth="56" />
                    <path d="M220 520 C 340 470, 420 560, 540 520 S 720 430, 790 470" fill="none" stroke="#9CC8E6" strokeWidth="38" />
                    <path d="M230 300 C 380 330, 560 290, 780 330" fill="none" stroke="#FBF3E2" strokeWidth="20" strokeLinecap="round" />
                    <House x={360} y={290} roof="#D96C4E" />
                    <House x={600} y={300} roof="#6F8FAF" />
                    <Tree x={470} y={410} s={0.9} tone="#6FA35B" />
                    <Tree x={680} y={420} s={0.8} tone="#8BBE73" />
                    <Tree x={330} y={430} s={0.85} tone="#7FB069" />
                  </g>
                  {RIM.map((it, i) => (
                    <g key={i} transform={rimTransform(it.a)}>
                      {it.kind === "tree" && <Tree x={0} y={-16} s={1.25} tone={it.tone!} />}
                      {it.kind === "house" && <House x={0} y={-14} roof={it.tone!} />}
                      {it.kind === "person" && <Villager p={it.p!} at={[0, 0]} i={i} />}
                      {it.kind === "store" && (
                        <g transform="translate(0 -18)">
                          <rect x="-24" y="-6" width="48" height="22" rx="3" fill="#FFF6E6" stroke="#D8C8AC" />
                          <path d="M-28 -8 H28 L24 3 H-24 Z" fill="#F5A68A" />
                          {[-18, -6, 6, 18].map((sx) => <path key={sx} d={`M${sx - 4} -8 h6 l-1 11 h-6 Z`} fill="#FFFFFF" />)}
                          <rect x="-6" y="4" width="12" height="12" fill="#B98A5E" />
                        </g>
                      )}
                    </g>
                  ))}
                </g>
                <circle cx={CX} cy={CY} r={R} fill="url(#shade)" pointerEvents="none" />
              </g>

              <GrowingTree />

              {/* 궤도를 도는 이동장터 트럭 */}
              <g>
                <rect x="-16" y="-14" width="22" height="14" rx="4" fill="#F3DA86" stroke="#C9A957" />
                <rect x="6" y="-10" width="10" height="10" rx="3" fill="#FFFFFF" stroke="#C9A957" />
                <circle cx="-9" cy="1" r="3.4" fill="#4A4A4A" />
                <circle cx="10" cy="1" r="3.4" fill="#4A4A4A" />
                <animateMotion path={ORBIT} dur="18s" repeatCount="indefinite" rotate="auto" />
              </g>

              {/* 떨어지는 잎 */}
              {[[250, 180, 0], [470, 210, 2.4], [400, 150, 4.6]].map(([x, y, d], i) => (
                <path
                  key={i}
                  d={`M${x} ${y} q 6 -8 12 0 q -6 8 -12 0 Z`}
                  fill="#9ACF95"
                  className="hero-leaf"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* 사라지는 가게들 */}
      <section id="about" className="max-w-[1280px] mx-auto px-8 pt-24 pb-8">
        <div className="grid grid-cols-12 gap-10 items-end">
          <div className="col-span-5">
            <h2 className="font-display text-[52px] font-extrabold leading-[1.05] tracking-[-0.02em]">
              More than
              <br />
              <span className="text-[#4F8A68]">a store.</span>
            </h2>
            <p className="text-[18px] font-bold mt-4">사라지는 건 가게만이 아니에요</p>
            <p className="text-[15px] text-text-secondary mt-4 leading-relaxed">
              농촌의 작은 가게는 물건만 파는 곳이 아니었어요. 쌀을 배달하고, 안부를 묻고, 택배를 맡아 주던 곳이죠.
              가게가 문을 닫으면 그 일들이 한꺼번에 사라집니다. 더 가까이는 그 기능을 하나씩 나눠, 마을 안에서 이어받을 곳을 찾아요.
            </p>
          </div>
          <dl className="col-span-7 grid grid-cols-3 gap-4">
            {[
              [String(closing), "곳", "폐업 예정 시설", "#F8D3C4"],
              [pop.toLocaleString(), "명", "영향받는 주민 (추정)", "#F7E7B6"],
              [`${FUNCTION_GAP_RATE.F02}`, "%", "신선식품 공백 법정리", "#D6EBDD"],
            ].map(([v, u, label, bg]) => (
              <div key={label} className="rounded-[24px] px-6 py-7" style={{ background: bg }}>
                <dd className="font-display text-[44px] font-extrabold leading-none text-[#2F5E43] tnum whitespace-nowrap">
                  {v}
                  <span className="text-[20px] text-text-secondary ml-1">{u}</span>
                </dd>
                <dt className="text-[13px] font-semibold text-text-secondary mt-3">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 이어받는 방법 */}
      <section id="how" className="max-w-[1280px] mx-auto px-8 py-20">
        <h2 className="font-display text-[52px] font-extrabold tracking-[-0.02em] leading-none">How it works</h2>
        <p className="text-[18px] font-bold mt-4">기능은 남기고, 이어받을 곳을 찾아요</p>
        <div className="grid grid-cols-3 gap-5 mt-10">
          {[
            ["01", "폐업 예정 시설 등록", "문을 닫을 가게와 날짜를 등록하면 위치와 주변 주민 수를 바로 계산해요."],
            ["02", "기능 나누기", "AI가 가게가 하던 일을 생필품·신선식품·무거운 상품·마을 거점 네 가지로 나눠요."],
            ["03", "이어받을 곳 추천", "이동장터·농협 배달·마을회관 같은 자원을 거리와 운영 시간으로 비교해 추천해요."],
          ].map(([n, t, d]) => (
            <div key={n} className="card card-hover p-7">
              <p className="font-display text-[48px] font-extrabold leading-none text-[#8FC79A]">{n}</p>
              <h3 className="text-[18px] font-bold mt-6">{t}</h3>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-10">
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
            우리 마을 살펴보기 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-8 h-16 flex items-center justify-between text-[12px] text-text-muted">
          <span>더 가까이 · 임실군 농촌 생활서비스 연계 플랫폼 (데모)</span>
          <span>그림은 실제 지형과 다를 수 있어요</span>
        </div>
      </footer>

      <style>{`
        .villager { animation: villager-bob .9s ease-in-out infinite alternate; }
        @keyframes villager-bob { to { transform: translateY(-1.6px) } }
        .grow-trunk { transform-origin: 0 0; animation: grow-trunk 1.1s cubic-bezier(.3,1.2,.4,1) .2s both; }
        @keyframes grow-trunk { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        .grow-leaf { animation: grow-pop .7s cubic-bezier(.3,1.5,.5,1) both; }
        .grow-fruit { animation: grow-pop .6s cubic-bezier(.3,1.7,.5,1) both; }
        @keyframes grow-pop { from { transform: scale(0) } to { transform: scale(1) } }
        .fruit-sway { animation: fruit-sway 2.6s ease-in-out infinite alternate; }
        @keyframes fruit-sway { from { transform: rotate(-5deg) } to { transform: rotate(5deg) } }
        .hero-cloud { animation: hero-cloud 9s ease-in-out infinite alternate; }
        @keyframes hero-cloud { to { transform: translateX(26px) } }
        .hero-leaf { transform-box: fill-box; transform-origin: center; animation: hero-leaf 7s linear infinite; opacity: 0; }
        @keyframes hero-leaf {
          0% { transform: translate(0, 0) rotate(0); opacity: 0 }
          10% { opacity: 1 }
          100% { transform: translate(-40px, 200px) rotate(260deg); opacity: 0 }
        }
      `}</style>
    </div>
  );
}
