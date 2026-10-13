# scripts/generate_mobility.py
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

def main():
    stops_path = BASE_DIR / "data" / "raw" / "imsil_bus_stops.csv"
    if not stops_path.exists():
        print(f"❌ 버스정류장 데이터가 없습니다: {stops_path}")
        return

    # 1. 버스정류장 데이터 로드
    df_stops = pd.read_csv(stops_path)
    print(f"원본 정류장 수: {len(df_stops)}개")

    # 2. 임실군 실제 지리적 범위 내의 정류장만 필터링 (이상치 제거)
    # 임실군 대략적 범위: 위도 35.4 ~ 35.8, 경도 127.1 ~ 127.4
    df_imsil = df_stops[
        (df_stops['latitude'].between(35.4, 35.8)) &
        (df_stops['longitude'].between(127.1, 127.4))
        ].copy()
    print(f"임실군 범위 내 유효 정류장 수: {len(df_imsil)}개 (이상치 제거됨)")

    # 3. 임실군 주요 읍/면 대표 좌표 (위도, 경도) 기준 가장 가까운 읍/면으로 매핑
    town_coords = {
        '임실읍': (35.615, 127.283),
        '오수면': (35.534, 127.323),
        '관촌면': (35.694, 127.258),
        '강진면': (35.522, 127.162),
        '신평면': (35.571, 127.337),
        '성수면': (35.657, 127.220),
        '덕치면': (35.561, 127.250),
        '삼계면': (35.516, 127.157),
        '지사면': (35.521, 127.281),
        '청웅면': (35.594, 127.226),
        '운암면': (35.638, 127.160),
        '신덕면': (35.629, 127.341)
    }

    def find_nearest_town(row):
        lat, lon = row['latitude'], row['longitude']
        min_dist = float('inf')
        nearest_town = '기타'
        for town, (t_lat, t_lon) in town_coords.items():
            # 단순 유클리드 거리 기준사정
            dist = (lat - t_lat)**2 + (lon - t_lon)**2
            if dist < min_dist:
                min_dist = dist
                nearest_town = town
        return nearest_town

    df_imsil['region_name'] = df_imsil.apply(find_nearest_town, axis=1)

    # 4. 읍/면별 집계 및 이동 취약성 산출
    mobility_rows = []
    for town, group in df_imsil.groupby('region_name'):
        stop_count = len(group)
        mean_lat = group['latitude'].mean()
        mean_lon = group['longitude'].mean()

        # 정류장 수가 적을수록 취약성 점수 높음 (0~100점)
        vulnerability_score = max(0, min(100, round(100 - (stop_count * 1.2), 1)))

        mobility_rows.append({
            "region_name": town,
            "bus_stop_count": stop_count,
            "center_latitude": round(mean_lat, 6),
            "center_longitude": round(mean_lon, 6),
            "mobility_vulnerability_score": vulnerability_score,
            "accessibility_grade": "취약" if vulnerability_score > 70 else "양호"
        })

    df_mobility = pd.DataFrame(mobility_rows)

    # 5. 결과 저장
    out_file = BASE_DIR / "data" / "processed" / "mobility.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    df_mobility.to_csv(out_file, index=False, encoding="utf-8-sig")

    print(f"✅ mobility.csv 정제 및 재생성 완료: {out_file}")
    print(df_mobility.to_string(index=False))

if __name__ == "__main__":
    main()
