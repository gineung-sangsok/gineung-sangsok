import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { API_BASE, FUNCTIONS } from "../data/constants";

import FunctionIcon from "../components/ui/FunctionIcon";
import { House, Tree, Villager, type Person } from "../components/VillageMap";

/**
 * 첫 화면 — 작은 마을 행성 위에 검은 종이 띠를 찢어 붙인 히어로.
 * 행성 가장자리의 집·나무·사람이 천천히 돈다.
 */

const CX = 500;
const CY = 400;
const R = 250;

// 행성 둘레에 서 있는 것들 (각도는 12시 방향이 0°)
const RIM: { a: number; kind: "tree" | "house" | "store" | "person"; tone?: string; p?: Person }[] = [
  { a: 28, kind: "house", tone: "#D96C4E" },
  { a: 40, kind: "tree", tone: "#7FB069" },
  { a: 52, kind: "person", p: { from: [0, 0], shirt: "#E8A33D", hair: "#3B2A20" } },
  { a: 66, kind: "store" },
  { a: 84, kind: "tree", tone: "#6FA35B" },
  { a: 120, kind: "house", tone: "#6F8FAF" },
  { a: 134, kind: "person", p: { from: [0, 0], shirt: "#5B8DB8", hair: "#D9D4CC", elder: true } },
  { a: 150, kind: "tree", tone: "#8BBE73" },
  { a: 172, kind: "house", tone: "#8A9A5B" },
  { a: 196, kind: "tree", tone: "#7FB069" },
  { a: 214, kind: "person", p: { from: [0, 0], shirt: "#D96C4E", hair: "#3B2A20", hat: "#F2D27A" } },
  { a: 232, kind: "house", tone: "#D96C4E" },
  { a: 262, kind: "tree", tone: "#6FA35B" },
  { a: 290, kind: "house", tone: "#6F8FAF" },
  { a: 304, kind: "tree", tone: "#93C27A" },
  { a: 318, kind: "person", p: { from: [0, 0], shirt: "#B07CC6", hair: "#5A3A28" } },
  { a: 332, kind: "tree", tone: "#7FB069" },
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

function rimTransform(a: number, lift = 0) {
  return `rotate(${a} ${CX} ${CY}) translate(${CX} ${CY - R - lift})`;
}

// 행성을 가로지르는 잎 덤불 띠 (위아래가 물결 모양)
const BAND = (() => {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let x = -20; x <= 1020; x += 20) {
    top.push(`${x} ${366 + Math.sin(x / 38) * 7}`);
    bottom.push(`${x} ${534 + Math.sin(x / 44 + 1) * 7}`);
  }
  return `M${top.join(" L")} L${bottom.reverse().join(" L")} Z`;
})();

// 띠 가장자리를 따라 왼쪽부터 차례로 돋아나는 잎
const LEAVES = Array.from({ length: 74 }, (_, i) => {
  const onTop = i % 2 === 0;
  const x = -10 + Math.floor(i / 2) * 29 + (onTop ? 0 : 14);
  const y = onTop ? 366 + Math.sin(x / 38) * 7 : 534 + Math.sin(x / 44 + 1) * 7;
  const tone = ["#8BC48A", "#A3D9B8", "#74B276", "#B9E0BE"][i % 4];
  const rot = (onTop ? -1 : 1) * (20 + ((i * 37) % 40)) * (i % 3 === 0 ? -1 : 1);
  return { x, y, onTop, tone, rot, size: 16 + ((i * 13) % 10) };
});
const BLOSSOMS = [[120, 372], [330, 528], [560, 366], [780, 532], [905, 370], [60, 532]];

export default function Landing() {
  const navigate = useNavigate();
  const [kpi, setKpi] = useState({ closures: 0, affected: 0, gapRi: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/closures`).then((r) => r.ok ? r.json() : []),
      fetch(`${API_BASE}/villages`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([cls, vil]: [{ closure_id: string; store: { village_id: string } }[], { village_id: string; population: { total: number | null } | null; has_food_store: boolean | null }[]]) => {
        const villageIds = new Set(cls.map((c) => c.store.village_id));
        const affected = vil.filter((v) => villageIds.has(v.village_id)).reduce((s, v) => s + (v.population?.total ?? 0), 0);
        const gapRi = vil.filter((v) => v.has_food_store === false).length;
        setKpi({ closures: cls.length, affected, gapRi });
      })
      .catch(() => {});
  }, []);

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

      {/* 히어로: 마을 행성 */}
      <section className="relative max-w-[1280px] mx-auto aspect-[1000/700] select-none">
        <svg viewBox="0 50 1000 700" className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <clipPath id="planet">
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
            <radialGradient id="shade" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#1C1C1C" stopOpacity="0.35" />
            </radialGradient>
          </defs>

          {/* 라임 고리 */}
          <circle cx={CX + 10} cy={CY + 8} r={R + 22} fill="none" stroke="#8FC79A" strokeWidth="16" />

          {/* 돌아가는 행성 */}
          <g className="planet-spin">
            <g clipPath="url(#planet)">
              <circle cx={CX} cy={CY} r={R} fill="#CFE0A0" />
              {PATCHES.map((p, i) => (
                <path key={i} d={p.d} fill={p.fill} stroke="#E8EFC8" strokeWidth="5" strokeLinejoin="round" />
              ))}
              <path d="M220 520 C 340 470, 420 560, 540 520 S 720 430, 790 470" fill="none" stroke="#E9DDBE" strokeWidth="56" />
              <path d="M220 520 C 340 470, 420 560, 540 520 S 720 430, 790 470" fill="none" stroke="#7FB2DA" strokeWidth="38" />
              <path d="M230 300 C 380 330, 560 290, 780 330" fill="none" stroke="#FBF3E2" strokeWidth="20" strokeLinecap="round" />
              <House x={360} y={290} roof="#D96C4E" />
              <House x={600} y={300} roof="#6F8FAF" />
              <Tree x={470} y={410} s={0.9} tone="#6FA35B" />
              <Tree x={680} y={420} s={0.8} tone="#8BBE73" />
              <Tree x={330} y={430} s={0.85} tone="#7FB069" />
              <circle cx={CX} cy={CY} r={R} fill="url(#shade)" />
            </g>
            {RIM.map((it, i) => (
              <g key={i} transform={rimTransform(it.a, -4)}>
                {it.kind === "tree" && <Tree x={0} y={-16} s={1.25} tone={it.tone!} />}
                {it.kind === "house" && <House x={0} y={-14} roof={it.tone!} />}
                {it.kind === "person" && <Villager p={it.p!} at={[0, 0]} i={i} />}
                {it.kind === "store" && (
                  <g transform="translate(0 -18)">
                    <rect x="-24" y="-6" width="48" height="22" rx="3" fill="#FFF6E6" stroke="#D8C8AC" />
                    <path d="M-28 -8 H28 L24 3 H-24 Z" fill="#E0402B" />
                    {[-18, -6, 6, 18].map((sx) => <path key={sx} d={`M${sx - 4} -8 h6 l-1 11 h-6 Z`} fill="#FFFFFF" />)}
                    <rect x="-6" y="4" width="12" height="12" fill="#B98A5E" />
                  </g>
                )}
              </g>
            ))}
          </g>

          {/* 찢은 검은 띠 */}
          <path d={BAND} fill="#CDE8D4" />
          <path d={BAND} fill="none" stroke="#FFFFFF" strokeWidth="4" opacity="0.7" />
          {LEAVES.map((l, i) => (
            <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot + (l.onTop ? 180 : 0)})`}>
              <g className="band-leaf" style={{ animationDelay: `${0.2 + (l.x + 20) / 900}s` }}>
                <path d={`M0 0 Q ${l.size * 0.55} ${l.size * 0.5} 0 ${l.size * 1.25} Q ${-l.size * 0.55} ${l.size * 0.5} 0 0 Z`} fill={l.tone} />
                <path d={`M0 2 L0 ${l.size}`} stroke="#ffffff66" strokeWidth="1.2" />
              </g>
            </g>
          ))}
          {BLOSSOMS.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className="band-leaf" style={{ animationDelay: `${1.4 + i * 0.15}s` }}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse key={a} cx="0" cy="-6" rx="4" ry="6" fill={i % 2 ? "#F8D3C4" : "#FFFFFF"} transform={`rotate(${a})`} />
                ))}
                <circle r="3" fill="#F3DA86" />
              </g>
            </g>
          ))}

          {/* 꼭대기: 나무를 심는 주민 둘 */}
          <g transform={`translate(${CX} ${CY - R - 2})`}>
            <Tree x={0} y={-30} s={1.6} tone="#6FA35B" />
            <g transform="translate(-34 0) scale(1.5)">
              <Villager p={{ from: [0, 0], shirt: "#E8A33D", hair: "#D9D4CC", elder: true }} at={[0, 0]} i={1} />
            </g>
            <g transform="translate(36 0) scale(1.35)">
              <Villager p={{ from: [0, 0], shirt: "#5B8DB8", hair: "#3B2A20", hat: "#F2D27A" }} at={[0, 0]} i={3} />
            </g>
          </g>
        </svg>

        {/* 띠 위 제목 */}
        <div className="absolute inset-x-0 top-[57%] -translate-y-1/2 text-center pointer-events-none">
          <h1 className="title-sticker title-sticker-lg leading-none text-[clamp(72px,11vw,150px)] -rotate-2">Closer<span className="text-[#F5A68A]">.</span></h1>
          <p className="title-sticker text-[clamp(22px,2.4vw,32px)] mt-3 rotate-1">더 가까이</p>
          <p className="text-[#2F5E43]/75 text-[clamp(13px,1.2vw,16px)] mt-2 font-medium">
            마을 가게가 문을 닫아도, 생활은 이어지도록 — 농촌 생활서비스 기능 상속 플랫폼
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-[3%] flex justify-center gap-2">
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
            대시보드 들어가기 <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/closures/new")} className="btn btn-ghost">
            폐업 예정 시설 등록
          </button>
        </div>
      </section>

      {/* 사라지는 가게들 */}
      <section id="about" className="bg-[#EAF6EC]">
        <div className="max-w-[1280px] mx-auto px-8 py-20 grid grid-cols-12 gap-10 items-end">
          <div className="col-span-5">
            <h2 className="title-sticker text-[56px] leading-[1.08] -rotate-1 origin-left">
              More than
              <br />
              <span className="text-[#F5A68A]">a store.</span>
            </h2>
            <p className="text-[18px] font-bold mt-4">사라지는 건 가게만이 아니에요</p>
            <p className="text-[15px] text-text-secondary mt-5 leading-relaxed">
              농촌의 작은 가게는 물건만 파는 곳이 아니었어요. 쌀을 배달하고, 안부를 묻고, 택배를 맡아 주던 곳이죠.
              가게가 문을 닫으면 그 일들이 한꺼번에 사라집니다. 더 가까이는 그 기능을 하나씩 나눠, 마을 안에서 이어받을 곳을 찾아요.
            </p>
          </div>
          <dl className="col-span-7 grid grid-cols-3 gap-4">
            {[
              [kpi.closures, "곳", "폐업 예정 시설", "#F8D3C4"],
              [kpi.affected.toLocaleString(), "명", "영향받는 주민 (추정)", "#F7E7B6"],
              [kpi.gapRi, "곳", "신선식품 공백 법정리", "#FFFFFF"],
            ].map(([v, u, label, bg]) => (
              <div key={label as string} className="rounded-[24px] px-6 py-7" style={{ background: bg as string }}>
                <dd className="font-title text-[44px] leading-none text-[#2F5E43] tnum whitespace-nowrap">
                  {v}
                  <span className="text-[20px] text-text-secondary ml-1">{u as string}</span>
                </dd>
                <dt className="text-[13px] font-semibold text-text-secondary mt-3">{label as string}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 이어받는 방법 */}
      <section id="how" className="max-w-[1280px] mx-auto px-8 py-20">
        <h2 className="title-sticker text-[56px] leading-none -rotate-1 origin-left">How it works</h2>
        <p className="text-[18px] font-bold mt-4">기능은 남기고, 이어받을 곳을 찾아요</p>
        <div className="grid grid-cols-3 gap-5 mt-10">
          {[
            ["01", "폐업 예정 시설 등록", "문을 닫을 가게와 날짜를 등록하면 위치와 주변 주민 수를 바로 계산해요."],
            ["02", "기능 나누기", "AI가 가게가 하던 일을 생필품·신선식품·무거운 상품·마을 거점 네 가지로 나눠요."],
            ["03", "이어받을 곳 추천", "이동장터·농협 배달·마을회관 같은 자원을 거리와 운영 시간으로 비교해 추천해요."],
          ].map(([n, t, d]) => (
            <div key={n} className="card card-hover p-7">
              <p className="title-sticker text-[48px] leading-none">{n}</p>
              <h3 className="text-[18px] font-bold mt-6">{t}</h3>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-10">
          {FUNCTIONS.map((f) => (
            <span key={f.code} className="flex items-center gap-2 text-[14px] font-semibold">
              <FunctionIcon code={f.code} size={36} /> {f.short}
            </span>
          ))}
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary ml-auto">
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
        .planet-spin { animation: planet-spin 120s linear infinite; transform-origin: ${CX}px ${CY}px; transform-box: view-box; }
        @keyframes planet-spin { to { transform: rotate(360deg) } }
        .band-leaf { animation: band-leaf .55s cubic-bezier(.3,1.6,.5,1) both; }
        @keyframes band-leaf { from { transform: scale(0) } to { transform: scale(1) } }
        .villager { animation: villager-bob .9s ease-in-out infinite alternate; }
        @keyframes villager-bob { to { transform: translateY(-1.6px) } }
      `}</style>
    </div>
  );
}
