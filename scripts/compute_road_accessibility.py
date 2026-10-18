"""법정리 중심점 기준 버스정류장까지 도로거리·이동시간 계산 스크립트.

OSMnx로 임실군 도로망을 수집하고, 법정리별 최근접 버스정류장까지의
도로거리(m)·도보 이동시간(분)을 계산해 accessibility_ri.csv를 교체한다.

먼저 MAX_RADIUS_M 이내 도로거리로 정류장을 찾고, 없으면 상한 없이 재탐색.
도로 경로가 없는 경우에만 직선거리로 대체한다.

입력:
  - data/processed/legal_ri_imsil.geojson
  - data/processed/bus_stops_imsil.csv
출력:
  - data/processed/imsil_road.graphml   (도로망, 재사용용)
  - data/processed/accessibility_ri.csv (nearest_stop_m 도로거리로 교체 + nearest_stop_min 추가)
컬럼: ri_code, ri_name, eup_myeon,
       nearest_stop_id, nearest_stop_name, nearest_stop_m, nearest_stop_min,
       calc_method
"""

from pathlib import Path

import geopandas as gpd
import networkx as nx
import osmnx as ox
import pandas as pd
from pyrosm import OSM
from shapely.geometry import Point

BASE_DIR = Path(__file__).resolve().parents[1]
RI_FILE = BASE_DIR / "data" / "processed" / "legal_ri_imsil.geojson"
STOP_FILE = BASE_DIR / "data" / "processed" / "bus_stops_imsil.csv"
GRAPH_FILE = BASE_DIR / "data" / "processed" / "imsil_road.graphml"
OUT_FILE = BASE_DIR / "data" / "processed" / "accessibility_ri.csv"

EPSG_CALC = 5179
PBF_FILE = BASE_DIR / "data" / "raw" / "south-korea-261014.osm.pbf"
WALK_SPEED_KMH = 4.0
INITIAL_RADIUS_M = 3000   # 첫 번째 후보 탐색 반경
RADIUS_STEP_M = 2000      # fallback 시 반경 증가 단위
MAX_RADIUS_M = 15000      # 첫 도로거리 탐색 상한


def load_or_download_graph() -> nx.MultiDiGraph:
    """도로망을 graphml에서 로드하거나 로컬 pbf에서 추출한다."""
    if GRAPH_FILE.exists():
        print(f"📂 도로망 로드: {GRAPH_FILE}")
        return ox.load_graphml(GRAPH_FILE)

    print("📦 로컬 pbf에서 임실군 도로망 추출 중...")
    ri = gpd.read_file(RI_FILE).to_crs(epsg=4326)
    bounds = ri.total_bounds  # minx, miny, maxx, maxy

    osm = OSM(str(PBF_FILE), bounding_box=list(bounds))
    nodes, edges = osm.get_network(nodes=True, network_type="walking")

    if nodes is None or edges is None:
        raise RuntimeError("pbf에서 도보 네트워크를 추출하지 못했습니다.")

    # pyrosm → networkx 그래프 변환
    G = osm.to_graph(nodes, edges, graph_type="networkx")

    GRAPH_FILE.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(G, GRAPH_FILE)
    print(f"💾 도로망 저장: {GRAPH_FILE} (노드 {len(G.nodes)}개, 엣지 {len(G.edges)}개)")
    return G


def main() -> None:
    # 법정리 중심점 (EPSG:5179)
    ri = gpd.read_file(RI_FILE).to_crs(epsg=EPSG_CALC)
    ri["centroid"] = ri.geometry.centroid
    print(f"📍 법정리 {len(ri)}개")

    # 버스정류장 (EPSG:5179)
    stops_df = pd.read_csv(STOP_FILE, encoding="utf-8-sig", dtype={"stop_id": str})
    stops_gdf = gpd.GeoDataFrame(
        stops_df,
        geometry=[
            Point(lon, lat)
            for lat, lon in zip(stops_df["latitude"], stops_df["longitude"], strict=False)
        ],
        crs="EPSG:4326",
    ).to_crs(epsg=EPSG_CALC)
    print(f"🚌 버스정류장 {len(stops_gdf)}개")

    # 도로망 로드
    G = load_or_download_graph()
    G_proj = ox.project_graph(G, to_crs=f"EPSG:{EPSG_CALC}")
    nodes, _ = ox.graph_to_gdfs(G_proj)
    print(f"🗺️  도로망 노드 {len(nodes)}개")

    # 정류장 → 최근접 도로 노드 매핑
    stop_coords = list(zip(stops_gdf.geometry.x, stops_gdf.geometry.y, strict=False))
    stop_nodes = ox.nearest_nodes(G_proj, [c[0] for c in stop_coords], [c[1] for c in stop_coords])

    records = []
    fallback_count = 0

    for _, row in ri.iterrows():
        cx, cy = row["centroid"].x, row["centroid"].y
        origin_node = ox.nearest_nodes(G_proj, cx, cy)

        # 도로거리 상한 내 정류장이 없으면 상한 없이 다시 탐색
        method = "road"
        best_idx = None
        best_dist = float("inf")

        for cutoff in (MAX_RADIUS_M, None):
            try:
                lengths = nx.single_source_dijkstra_path_length(
                    G_proj, origin_node, cutoff=cutoff, weight="length",
                )
            except nx.NodeNotFound:
                lengths = {}

            for i, snode in enumerate(stop_nodes):
                if snode in lengths and lengths[snode] < best_dist:
                    best_dist = lengths[snode]
                    best_idx = i

            if best_idx is not None:
                break

        # 도로 경로 없으면 직선거리 fallback
        if best_idx is None:
            method = "straight_fallback"
            fallback_count += 1
            for i, (sx, sy) in enumerate(stop_coords):
                d = ((cx - sx) ** 2 + (cy - sy) ** 2) ** 0.5
                if d < best_dist:
                    best_dist = d
                    best_idx = i

        nearest = stops_gdf.iloc[best_idx]
        walk_min = round(best_dist / (WALK_SPEED_KMH * 1000 / 60), 1)

        records.append({
            "ri_code": row["ri_code"],
            "ri_name": row["ri_name"],
            "eup_myeon": row["eup_myeon"],
            "nearest_stop_id": nearest["stop_id"],
            "nearest_stop_name": nearest["stop_name"],
            "nearest_stop_m": round(best_dist),
            "nearest_stop_min": walk_min,
            "calc_method": method,
        })

    # 직선거리 비교용: 저장 전에 기존 파일을 읽어둔다
    prev_avg = None
    if OUT_FILE.exists():
        prev = pd.read_csv(OUT_FILE, encoding="utf-8-sig")
        if "nearest_stop_m" in prev.columns:
            prev_avg = prev["nearest_stop_m"].mean()

    result = pd.DataFrame(records)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"\n✅ 저장 완료: {OUT_FILE} ({len(result)}건)")
    print(f"   fallback(직선거리) 법정리: {fallback_count}건")

    if prev_avg is not None:
        avg_road = result["nearest_stop_m"].mean()
        print(f"   이전 평균: {prev_avg:.0f}m → 도로거리 평균: {avg_road:.0f}m "
              f"({avg_road/prev_avg*100-100:+.1f}%)")

    print("\n📊 읍면별 평균 도로거리(m) / 이동시간(분):")
    summary = result.groupby("eup_myeon")[["nearest_stop_m", "nearest_stop_min"]].mean().astype(int)
    print(summary.sort_values("nearest_stop_m", ascending=False).to_string())


if __name__ == "__main__":
    main()
