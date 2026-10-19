# scripts/generate_mobility.py
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]

def main():
    """정류장을 읍면별로 집계해 정류장 수 기반 임시 이동취약성 CSV를 생성한다."""
    stops_path = BASE_DIR / "data" / "processed" / "imsil_bus_stops.csv"
    if not stops_path.exists():
        print(f"❌ 버스정류장 데이터가 없습니다: {stops_path}")
        sys.exit(1)

    # 1. 버스정류장 데이터 로드
    df_stops = pd.read_csv(stops_path)
    print(f"원본 정류장 수: {len(df_stops)}개")

    # 2. 임실군 주요 읍/면 대표 좌표 (위도, 경도) 기준 가장 가까운 읍/면으로 매핑
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
        """정류장 행의 위경도와 제곱 좌표 거리가 가장 가까운 읍면명을 반환한다."""
        lat, lon = row['latitude'], row['longitude']
        min_dist = float('inf')
        nearest_town = '기타'
        for town, (t_lat, t_lon) in town_coords.items():
            dist = (lat - t_lat)**2 + (lon - t_lon)**2
            if dist < min_dist:
                min_dist = dist
                nearest_town = town
        return nearest_town

    df_stops['region_name'] = df_stops.apply(find_nearest_town, axis=1)

    # 3. 읍/면별 집계 및 이동 취약성 산출
    # TODO(임시): 마을 대표점 확정 후 nearest_bus_stop_m 기반 점수로 교체
    mobility_rows = []
    for town, group in df_stops.groupby('region_name'):
        stop_count = len(group)
        mean_lat = group['latitude'].mean()
        mean_lon = group['longitude'].mean()

        vulnerability_score = max(0, min(100, round(100 - (stop_count * 1.2), 1)))

        mobility_rows.append({
            "region_name": town,
            "bus_stop_count": stop_count,
            "center_latitude": round(mean_lat, 6),
            "center_longitude": round(mean_lon, 6),
            "mobility_vulnerability_score": vulnerability_score,
            "score_method": "임시(정류장수 기반)",
            "accessibility_grade": "취약" if vulnerability_score > 70 else "양호"
        })

    df_mobility = pd.DataFrame(mobility_rows)

    # 4. 결과 저장
    out_file = BASE_DIR / "data" / "processed" / "mobility.csv"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    df_mobility.to_csv(out_file, index=False, encoding="utf-8-sig")

    print(f"✅ mobility.csv 정제 완료: {out_file}")
    print(df_mobility.to_string(index=False))

if __name__ == "__main__":
    main()
