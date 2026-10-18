"""법정리 중심점 기준 최근접 식료품점 도로거리 계산 스크립트.

OSMnx 도로망을 이용해 법정리별 최근접 식료품점까지의
도로거리(m)·도보 이동시간(분)을 계산한다.

입력:
  - data/processed/legal_ri_imsil.geojson       (법정리 경계, EPSG:4326)
  - data/raw/sbiz_stores_imsil_20261013.csv      (소상공인 상가정보)
  - data/raw/south-korea-261014.osm.pbf          (OSM 도로망)
출력:
  - data/processed/imsil_road.graphml            (도로망, 재사용용)
  - data/processed/food_accessibility_ri.csv
컬럼: ri_code, ri_name, eup_myeon,
       nearest_store_id, nearest_store_name, nearest_store_m,
       nearest_store_min, has_food_store, calc_method
거리 계산: EPSG:5179 도로거리 (UTM-K, 미터 단위)
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
STORE_FILE = BASE_DIR / "data" / "raw" / "sbiz_stores_imsil_20261013.csv"
GRAPH_FILE = BASE_DIR / "data" / "processed" / "imsil_road.graphml"
OUT_FILE = BASE_DIR / "data" / "processed" / "food_accessibility_ri.csv"
PBF_FILE = BASE_DIR / "data" / "raw" / "south-korea-261014.osm.pbf"

EPSG_CALC = 5179
WALK_SPEED_KMH = 4.0
INITIAL_RADIUS_M = 3000
RADIUS_STEP_M = 2000
MAX_RADIUS_M = 15000

# 식료품점으로 인정하는 소분류 (function_taxonomy.md F01·F02 기준)
FOOD_SUBCATEGORIES = {
    "슈퍼마켓",
    "편의점",
    "반찬/식료품 소매업",
    "채소/과일 소매업",
    "정육점",
    "건어물/젓갈 소매업",
    "수산물 소매업",
    "곡물/곡분 소매업",
}

GAP_THRESHOLD_M = 1000


def load_or_build_graph():
    """도로망을 graphml에서 로드하거나 로컬 pbf에서 추출한다."""
    if GRAPH_FILE.exists():
        print(f"📂 도로망 로드: {GRAPH_FILE}")
        return ox.load_graphml(GRAPH_FILE)

    print("📦 로컬 pbf에서 임실군 도로망 추출 중...")
    ri = gpd.read_file(RI_FILE).to_crs(epsg=4326)
    bounds = ri.total_bounds
    osm = OSM(str(PBF_FILE), bounding_box=list(bounds))
    nodes, edges = osm.get_network(nodes=True, network_type="walking")
    if nodes is None or edges is None:
        raise RuntimeError("pbf에서 도보 네트워크를 추출하지 못했습니다.")

    G = osm.to_graph(nodes, edges, graph_type="networkx")
    GRAPH_FILE.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(G, GRAPH_FILE)
    print(
        f"💾 도로망 저장: {GRAPH_FILE}"
        f" (노드 {len(G.nodes)}개, 엣지 {len(G.edges)}개)"
    )
    return G


def load_food_stores():
    """소상공인 상가정보에서 식료품점을 필터링해 GeoDataFrame으로 반환한다."""
    df = pd.read_csv(STORE_FILE, encoding="utf-8-sig", low_memory=False)
    food = df[df["indsSclsNm"].isin(FOOD_SUBCATEGORIES)].copy()
    food = food.dropna(subset=["lon", "lat"])
    food["store_id"] = "store_" + food["bizesId"].astype(str)
    gdf = gpd.GeoDataFrame(
        food,
        geometry=[
            Point(lon, lat) for lon, lat in zip(food["lon"], food["lat"])
        ],
        crs="EPSG:4326",
    ).to_crs(epsg=EPSG_CALC)
    print(f"🏪 식료품점 {len(gdf)}개 로드 완료")
    print(food["indsSclsNm"].value_counts().to_string())
    return gdf


def compute_road_distance(G, origin_node, dest_node):
    """두 노드 간 도로거리(m)를 반환한다. 경로 없으면 None."""
    try:
        return nx.shortest_path_length(
            G, origin_node, dest_node, weight="length"
        )
    except nx.NetworkXNoPath:
        return None


def main():
    # 법정리 중심점
    ri = gpd.read_file(RI_FILE).to_crs(epsg=EPSG_CALC)
    ri["centroid"] = ri.geometry.centroid
    print(f"📍 법정리 {len(ri)}개")

    # 식료품점
    stores = load_food_stores()
    if stores.empty:
        print("❌ 식료품점 데이터가 비어 있습니다.")
        raise SystemExit(1)

    # 도로망
    G = load_or_build_graph()
    G_proj = ox.project_graph(G, to_crs=f"EPSG:{EPSG_CALC}")
    nodes_gdf, _ = ox.graph_to_gdfs(G_proj)
    print(f"🗺️  도로망 노드 {len(nodes_gdf)}개")

    # 식료품점 → 최근접 도로 노드 매핑
    store_coords = list(zip(stores.geometry.x, stores.geometry.y))
    store_nodes = ox.nearest_nodes(
        G_proj, [c[0] for c in store_coords], [c[1] for c in store_coords]
    )
    store_ids = stores["store_id"].tolist()
    store_names = stores["bizesNm"].tolist()

    records = []
    fallback_count = 0

    for idx, row in ri.iterrows():
        cx, cy = row["centroid"].x, row["centroid"].y
        origin_node = ox.nearest_nodes(G_proj, cx, cy)
        ri_name = row["ri_name"]

        # 반경 늘려가며 후보 식료품점 탐색
        radius = INITIAL_RADIUS_M
        candidates = []
        method = "road"

        while radius <= MAX_RADIUS_M:
            for i, (sx, sy) in enumerate(store_coords):
                straight = ((cx - sx) ** 2 + (cy - sy) ** 2) ** 0.5
                if straight <= radius:
                    candidates.append(i)
            if candidates:
                break
            radius += RADIUS_STEP_M

        # 후보 중 도로거리 최소 식료품점 선택
        best_idx = None
        best_dist = float("inf")

        if candidates:
            for i in candidates:
                dist = compute_road_distance(
                    G_proj, origin_node, store_nodes[i]
                )
                if dist is not None and dist < best_dist:
                    best_dist = dist
                    best_idx = i

        # 도로 경로 없으면 직선거리 fallback
        if best_idx is None:
            method = "straight_fallback"
            fallback_count += 1
            for i, (sx, sy) in enumerate(store_coords):
                d = ((cx - sx) ** 2 + (cy - sy) ** 2) ** 0.5
                if d < best_dist:
                    best_dist = d
                    best_idx = i

        walk_min = round(best_dist / (WALK_SPEED_KMH * 1000 / 60), 1)

        records.append({
            "ri_code": row["ri_code"],
            "ri_name": ri_name,
            "eup_myeon": row["eup_myeon"],
            "nearest_store_id": store_ids[best_idx],
            "nearest_store_name": store_names[best_idx],
            "nearest_store_m": round(best_dist),
            "nearest_store_min": walk_min,
            "has_food_store": best_dist <= GAP_THRESHOLD_M,
            "calc_method": method,
        })

        print(f"  {ri_name:8s} → {store_names[best_idx]:20s}"
              f"  {round(best_dist):,}m ({method})")

    result = pd.DataFrame(records)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUT_FILE, index=False, encoding="utf-8-sig")

    print(f"\n✅ 저장 완료: {OUT_FILE} ({len(result)}건)")
    print(f"   fallback(직선거리) 법정리: {fallback_count}건")

    # 기준별 공백 법정리 수
    total = len(result)
    print("\n📊 기준별 공백 법정리 수 (식료품점 도로거리 기준):")
    for t in [0.5, 1.0, 1.5, 2.0, 3.0, 5.0]:
        gap = (result["nearest_store_m"] > t * 1000).sum()
        print(f"  {t:.1f}km 초과: {gap:3}개 ({gap / total * 100:.1f}%)")

    print("\n📋 1km 초과 공백 법정리:")
    gap_df = (
        result[result["nearest_store_m"] > GAP_THRESHOLD_M]
        [["ri_name", "eup_myeon", "nearest_store_name",
          "nearest_store_m", "nearest_store_min"]]
        .sort_values("nearest_store_m", ascending=False)
    )
    print(gap_df.to_string(index=False))

    print("\n📊 읍면별 평균 도로거리(m) / 이동시간(분):")
    summary = (
        result.groupby("eup_myeon")[["nearest_store_m", "nearest_store_min"]]
        .mean().astype(int)
    )
    print(summary.sort_values("nearest_store_m", ascending=False).to_string())


if __name__ == "__main__":
    main()
