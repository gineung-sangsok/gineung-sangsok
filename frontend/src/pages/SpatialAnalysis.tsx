import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import { Search, X, Layers, Users, MapPin, Bus, Maximize2, Crosshair } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import StatusBadge from "../components/ui/StatusBadge";
import { API_BASE, FN, FUNCTIONS, type FnCode, type ApiEntity, type FunctionTag, type GapResponse } from "../data/constants";
import { riMetrics, fetchVillages, buildGapMap, type RiMetrics, type VillageRecord } from "../data/demo";

const IMSIL_CENTER: [number, number] = [35.617, 127.289];
const IMSIL_ZOOM = 11;
const VWORLD_TILE =
  "https://api.vworld.kr/req/wmts/1.0.0/1EF33D09-6790-4C6A-9365-273446863EB7/Base/{z}/{y}/{x}.png";

type Filter = "ALL" | FnCode;

interface RiProperties { ri_code: string; ri_name: string; eup_myeon: string }
interface RiItem { props: RiProperties; m: RiMetrics; layer: L.Path }

const valueOf = (_m: RiMetrics, _f: Filter) => _m.aging;

function agingColor(v: number): string {
  if (v >= 40) return "#B23A48";
  if (v >= 30) return "#E07A5F";
  if (v >= 20) return "#F2B880";
  if (v >= 10) return "#9CCFC2";
  return "#D8ECE7";
}

export default function SpatialAnalysis() {
  const [params] = useSearchParams();
  const initial: Filter = FUNCTIONS.find((f) => f.code === params.get("fn"))?.code ?? "ALL";

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<RiItem[]>([]);
  const stateRef = useRef<{ filter: Filter; selected: string | null; bin: number | null; mode: "gap" | "outline" }>({ filter: initial, selected: null, bin: null, mode: "gap" });

  const [items, setItems] = useState<RiItem[]>([]);
  const [filter, setFilter] = useState<Filter>(initial);
  const [selected, setSelected] = useState<RiItem | null>(null);
  const [bin, setBin] = useState<number | null>(null);
  const [mode, setMode] = useState<"gap" | "outline">("gap");
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [eupFilter, setEupFilter] = useState<string | null>(null);
  // 마을별 기능 커버리지: village_id → 해당 마을에서 제공되는 기능 코드 Set
  const [villageFns, setVillageFns] = useState<Map<string, Set<FnCode>>>(new Map());

  const styleFor = (it: RiItem): L.PathOptions => {
    const s = stateRef.current;
    const v = valueOf(it.m, s.filter);
    const isSel = s.selected === it.props.ri_code;
    if (s.mode === "outline") {
      return { fillColor: "#4F8A68", fillOpacity: isSel ? 0.45 : 0.08, color: isSel ? "#1C1C1C" : "#2F5E43", weight: isSel ? 3 : 1, opacity: 0.8 };
    }
    return {
      fillColor: agingColor(v),
      fillOpacity: isSel ? 0.92 : 0.72,
      color: isSel ? "#1C1C1C" : "#ffffff",
      weight: isSel ? 3 : 1,
      opacity: 1,
    };
  };

  const restyle = () => itemsRef.current.forEach((it) => it.layer.setStyle(styleFor(it)));

  useEffect(() => {
    stateRef.current = { filter, selected: selected?.props.ri_code ?? null, bin, mode };
    restyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, selected, bin, mode]);

  const closureId = params.get("closure");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: IMSIL_CENTER, zoom: IMSIL_ZOOM, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    L.tileLayer(VWORLD_TILE, { attribution: "© VWorld", maxZoom: 18 }).addTo(map);

    const villagePromise = fetchVillages().catch((err) => {
      console.warn("마을 지표 로드 실패", err);
      return new Map() as Awaited<ReturnType<typeof fetchVillages>>;
    });

    const gapPromise = closureId
      ? fetch(`${API_BASE}/closures/${closureId}/gap`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: GapResponse | null) => (d ? buildGapMap(d.villages) : new Map()))
          .catch(() => new Map() as ReturnType<typeof buildGapMap>)
      : Promise.resolve(new Map() as ReturnType<typeof buildGapMap>);

    Promise.all([
      fetch("/data/legal_ri_imsil.geojson").then((res) => res.json()),
      villagePromise,
      gapPromise,
    ])
      .then(([geojson, villageMap, gapMap]) => {
        const list: RiItem[] = [];
        const gj = L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
            const props = (feature as { properties: RiProperties }).properties;
            const village = villageMap.get(props.ri_code);
            const apiGap = gapMap.get(props.ri_code);
            const it: RiItem = { props, m: riMetrics(props.ri_code, props.eup_myeon, village, apiGap), layer: layer as L.Path };
            list.push(it);
            (layer as L.Path).setStyle(styleFor(it));
            layer.bindTooltip(() => {
              return `<div style="min-width:150px"><div style="font-weight:700;font-size:13px">${props.ri_name}</div><div style="opacity:.6;font-size:11px;margin-bottom:6px">${props.eup_myeon}</div><div style="display:flex;justify-content:space-between;gap:12px"><span style="opacity:.7">인구</span><b>${it.m.pop}명</b></div><div style="display:flex;justify-content:space-between"><span style="opacity:.7">고령화율</span><b>${it.m.aging}%</b></div></div>`;
            }, { className: "ri-tip", sticky: true, direction: "top", offset: [0, -8] });
            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ weight: 2.5, color: "#1C1C1C" });
              (layer as L.Path).bringToFront();
            });
            layer.on("mouseout", () => (layer as L.Path).setStyle(styleFor(it)));
            layer.on("click", () => {
              setSelected(it);
              map.flyToBounds((layer as L.Polygon).getBounds(), { padding: [120, 120], maxZoom: 13, duration: 0.8 });
            });
          },
        }).addTo(map);
        itemsRef.current = list;
        setItems(list);
        map.fitBounds(gj.getBounds(), { padding: [20, 20] });
      })
      .catch(() => console.warn("GeoJSON 로드 실패"));

    // GET /stores + /resources → 자원 마커 + 마을별 기능 커버리지
    Promise.all([
      fetch(`${API_BASE}/stores`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/resources`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([stores, resources]: [ApiEntity[], ApiEntity[]]) => {
        const all = [...stores, ...resources];
        const fnMap = new Map<string, Set<FnCode>>();
        for (const e of all) {
          // 마커 표시
          if (e.location) {
            const color = e.entity_type === "store" ? "#B23A48" : "#2F5E43";
            L.circleMarker([e.location.lat, e.location.lng], {
              radius: 5, fillColor: color, fillOpacity: 0.85, color: "#fff", weight: 1.5,
            })
              .bindTooltip(`<b>${e.name}</b><br/><span style="opacity:.7">${e.resource_type ?? e.entity_type}</span>`, { direction: "top", offset: [0, -6] })
              .addTo(map);
          }
          // 기능 커버리지 집계
          if (e.village_id && e.functions?.length) {
            if (!fnMap.has(e.village_id)) fnMap.set(e.village_id, new Set());
            const s = fnMap.get(e.village_id)!;
            for (const ft of e.functions as FunctionTag[]) s.add(ft.code as FnCode);
          }
        }
        setVillageFns(fnMap);
      })
      .catch(() => console.warn("자원 데이터 로드 실패"));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closureId]);

  const resetView = () => {
    setSelected(null);
    const all = itemsRef.current;
    if (all.length) mapRef.current?.flyToBounds(L.featureGroup(all.map((i) => i.layer)).getBounds(), { padding: [20, 20], duration: 0.8 });
  };

  const focusRi = (it: RiItem) => {
    setSelected(it);
    setSearchOpen(false);
    setQ("");
    mapRef.current?.flyToBounds((it.layer as L.Polygon).getBounds(), { padding: [120, 120], maxZoom: 13, duration: 0.8 });
  };

  const scoped = eupFilter ? items.filter((i) => i.props.eup_myeon === eupFilter) : items;

  const byEup = useMemo(() => {
    const g: Record<string, number[]> = {};
    items.forEach((i) => (g[i.props.eup_myeon] ??= []).push(i.m.aging));
    return Object.entries(g)
      .map(([name, v]) => ({ name, value: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const results = q.trim() ? items.filter((i) => `${i.props.eup_myeon} ${i.props.ri_name}`.includes(q.trim())).slice(0, 8) : [];
  const accent = filter === "ALL" ? "#2F5E43" : FN[filter].hex;

  return (
    <div className="h-full flex gap-5 min-h-[640px]">
      {/* MAP */}
      <div className="relative flex-1 card overflow-hidden animate-fade-in">
        <div ref={containerRef} className="absolute inset-0" />

        {/* top overlay */}
        <div className="absolute top-4 left-4 right-4 z-[500] flex items-start gap-3 pointer-events-none">
          <div className="pointer-events-auto bg-surface/95 backdrop-blur rounded-2xl p-1.5 flex gap-1" style={{ boxShadow: "var(--shadow-lift)" }}>
            <div className="h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex items-center gap-1.5 bg-[#2F5E43] text-white" style={{ boxShadow: "0 6px 14px -6px #2F5E43" }}>
              인구 · 접근성
            </div>
          </div>

          <div className="pointer-events-auto relative ml-auto w-[260px]">
            <div className="bg-surface/95 backdrop-blur rounded-2xl h-12 flex items-center gap-2 px-3.5" style={{ boxShadow: "var(--shadow-lift)" }}>
              <Search className="w-4 h-4 text-text-muted" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && results[0] && focusRi(results[0])}
                placeholder="법정리 찾기 (예: 죽계)"
                className="flex-1 bg-transparent outline-none text-[13px]"
              />
              {q && <button onClick={() => setQ("")}><X className="w-4 h-4 text-text-muted" /></button>}
            </div>
            {searchOpen && results.length > 0 && (
              <div className="absolute mt-2 w-full bg-surface rounded-2xl p-1.5 animate-scale-in" style={{ boxShadow: "var(--shadow-pop)" }}>
                {results.map((r) => (
                  <button key={r.props.ri_code} onClick={() => focusRi(r)} className="w-full flex items-center gap-2.5 px-2.5 h-10 rounded-xl hover:bg-surface-secondary text-left">
                    <span className="w-3 h-3 rounded" style={{ background: agingColor(r.m.aging) }} />
                    <span className="text-[13px] font-semibold">{r.props.ri_name}</span>
                    <span className="text-[12px] text-text-muted">{r.props.eup_myeon}</span>
                    <span className="ml-auto text-[12px] font-bold tnum">{r.m.aging}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* right tools */}
        <div className="absolute top-20 right-4 z-[500] flex flex-col gap-2">
          {[
            { icon: Layers, title: mode === "gap" ? "경계만 보기" : "공백지수 보기", on: mode === "outline", fn: () => setMode((m) => (m === "gap" ? "outline" : "gap")) },
            { icon: Maximize2, title: "전체 보기", on: false, fn: resetView },
          ].map(({ icon: Icon, title, on, fn }) => (
            <button key={title} onClick={fn} title={title} className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center transition-all hover:scale-105 ${on ? "bg-action text-white" : "bg-surface text-text-primary"}`} style={{ boxShadow: "var(--shadow-card)" }}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* legend */}
        {mode === "gap" && (
          <div className="absolute bottom-4 left-4 z-[500] bg-surface/95 backdrop-blur rounded-2xl p-4 w-[220px] animate-fade-up" style={{ boxShadow: "var(--shadow-lift)" }}>
            <p className="text-[12px] font-bold mb-2.5">고령화율</p>
            <div className="space-y-0.5">
              {[
                { label: "40% 이상", color: "#B23A48" },
                { label: "30–39%", color: "#E07A5F" },
                { label: "20–29%", color: "#F2B880" },
                { label: "10–19%", color: "#9CCFC2" },
                { label: "10% 미만", color: "#D8ECE7" },
              ].map((b) => {
                const count = items.filter((i) => {
                  const a = i.m.aging;
                  if (b.label === "40% 이상") return a >= 40;
                  if (b.label === "30–39%") return a >= 30 && a < 40;
                  if (b.label === "20–29%") return a >= 20 && a < 30;
                  if (b.label === "10–19%") return a >= 10 && a < 20;
                  return a < 10;
                }).length;
                return (
                  <div key={b.label} className="w-full flex items-center gap-2.5 px-2 h-7 rounded-lg text-[12px]">
                    <span className="w-4 h-3 rounded-[4px]" style={{ background: b.color }} />
                    <span className="flex-1 text-left text-text-secondary">{b.label}</span>
                    <span className="font-bold tnum">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto thin-scroll pr-1 stagger">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-bold">공간 분석</h1>
            {eupFilter && (
              <button onClick={() => setEupFilter(null)} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-brand-soft text-action text-[11.5px] font-bold animate-pop">
                {eupFilter} <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">법정리 단위 인구 · 고령화 · 접근성 현황</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { k: "법정리", v: scoped.length, s: "곳" },
              { k: "총 인구", v: scoped.reduce((a, i) => a + i.m.pop, 0), s: "명" },
              { k: "평균 고령화", v: scoped.length ? Math.round(scoped.reduce((a, i) => a + i.m.aging, 0) / scoped.length) : 0, s: "%" },
              { k: "기능 공백 리", v: scoped.filter((i) => { const fns = villageFns.get(i.props.ri_code); return !fns || fns.size < 4; }).length, s: "곳" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl bg-surface-tint border border-border p-3">
                <p className="text-[11px] text-text-muted">{x.k}</p>
                <p className="text-[19px] font-bold mt-0.5 tracking-tight" style={{ color: accent }}>
                  <AnimatedNumber value={x.v} duration={600} />
                  <span className="text-[11px] text-text-muted font-semibold">{x.s}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* selected ri */}
        <div className="card p-5">
          {selected ? (
            <div key={selected.props.ri_code} className="animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11.5px] text-text-muted">{selected.props.eup_myeon} · {selected.props.ri_code}</p>
                  <h3 className="text-[19px] font-bold">{selected.props.ri_name}</h3>
                </div>
                <button onClick={resetView} className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[12px]">
                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-text-muted" /><b className="tnum">{selected.m.pop}</b>명</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-text-muted" />고령 <b className="tnum">{selected.m.aging}%</b></div>
                <div className="flex items-center gap-1.5"><Bus className="w-3.5 h-3.5 text-text-muted" /><b className="tnum">{selected.m.stopM}</b>m</div>
              </div>
              <div className="space-y-2 mt-4 pt-3 border-t border-border">
                <p className="text-[11px] font-bold text-text-muted mb-2">기능 커버리지</p>
                {FUNCTIONS.map((f) => {
                  const covered = villageFns.get(selected.props.ri_code)?.has(f.code) ?? false;
                  return (
                    <div key={f.code} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.hex }} />
                      <span className="text-[12px] font-bold w-7" style={{ color: f.deep }}>{f.code}</span>
                      <span className="text-[12px] text-text-secondary flex-1">{f.short}</span>
                      <StatusBadge variant={covered ? "confirmed" : "error"} dot>
                        {covered ? "커버됨" : "공백"}
                      </StatusBadge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-soft mx-auto flex items-center justify-center mb-3 animate-[pulse-ring_1.8s_ease-out_infinite]">
                <Crosshair className="w-5 h-5 text-brand" />
              </div>
              <p className="text-[13px] font-semibold">지도에서 법정리를 선택하세요</p>
              <p className="text-[12px] text-text-muted mt-1">클릭하면 확대되고 상세 지표가 표시됩니다</p>
            </div>
          )}
        </div>

        {/* eup chart */}
        <div className="card p-5">
          <p className="text-[14px] font-bold text-action">읍·면별 평균 고령화율</p>
          <p className="text-[11.5px] text-text-muted mb-2">막대를 클릭하면 해당 읍·면으로 집계를 좁힙니다</p>
          <div className="h-[300px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byEup} layout="vertical" margin={{ left: 0, right: 16 }} key={filter}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "#4E5A4E" }} />
                <Tooltip cursor={{ fill: "#2F5E430a" }} content={({ active, payload }) => active && payload?.length ? <div className="px-2.5 py-1.5 rounded-lg bg-[#1C1C1C] text-white text-[12px] font-semibold">{payload[0].payload.name} · {payload[0].value}</div> : null} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14} animationDuration={700} onClick={(d) => setEupFilter((p) => ((d as unknown as { name: string }).name === p ? null : (d as unknown as { name: string }).name))} className="cursor-pointer">
                  {byEup.map((e) => (
                    <Cell key={e.name} fill={agingColor(e.value)} fillOpacity={eupFilter && eupFilter !== e.name ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
