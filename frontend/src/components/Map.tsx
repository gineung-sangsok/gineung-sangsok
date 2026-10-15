import { useEffect, useRef } from "react";
import L from "leaflet";

// 임실군 중심 좌표 (계약 v1.0)
const IMSIL_CENTER: [number, number] = [35.617, 127.289];
const IMSIL_ZOOM = 11;

// VWorld 배경지도 타일 (tech_stack.md 기준)
const VWORLD_TILE =
  "https://api.vworld.kr/req/wmts/1.0.0/1EF33D09-6790-4C6A-9365-273446863EB7/Base/{z}/{y}/{x}.png";

/**
 * 고령화율 → 색상 (추후 공백 점수로 교체 예정)
 * @param agingRate 고령화율 (%)
 * @returns 고령화율 구간에 대응하는 색상 코드
 */
function getColor(agingRate: number): string {
  if (agingRate >= 50) return "#b30000";
  if (agingRate >= 45) return "#e34a33";
  if (agingRate >= 40) return "#fc8d59";
  if (agingRate >= 35) return "#fdcc8a";
  return "#fef0d9";
}

interface RiFeature {
  properties: {
    ri_code: string;
    ri_name: string;
    eup_myeon: string;
    // villages_ri.csv 결합 후 추가될 필드 (현재는 GeoJSON에 없음, 추후 연동)
    aging_rate?: number;
    nearest_stop_m?: number;
    total_pop?: number;
  };
}

/**
 * 임실군 법정리 경계와 고령화율을 보여주는 Leaflet 지도 컴포넌트.
 * VWorld 배경지도 위에 법정리 GeoJSON을 로드하여 고령화율에 따른 색상과
 * 상세 정보 팝업/하이라이트 인터랙션을 제공한다.
 */
export default function Map() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // 지도 초기화
    const map = L.map(containerRef.current, {
      center: IMSIL_CENTER,
      zoom: IMSIL_ZOOM,
    });
    mapRef.current = map;

    // VWorld 배경지도
    L.tileLayer(VWORLD_TILE, {
      attribution: "© VWorld",
      maxZoom: 18,
    }).addTo(map);

    // 법정리 GeoJSON 로드
    fetch("/data/legal_ri_imsil.geojson")
      .then((res) => res.json())
      .then((geojson) => {
        L.geoJSON(geojson, {
          /** 법정리(feature)의 고령화율에 따라 채움 색상 등 스타일을 결정한다. */
          style: (feature) => {
            const f = feature as RiFeature;
            const agingRate = f.properties.aging_rate ?? 0;
            return {
              fillColor: getColor(agingRate),
              fillOpacity: 0.6,
              color: "#555",
              weight: 1,
            };
          },
          /** 각 법정리 레이어에 팝업과 마우스 오버/아웃 하이라이트 이벤트를 바인딩한다. */
          onEachFeature: (feature, layer) => {
            const f = feature as RiFeature;
            const { ri_name, eup_myeon, aging_rate, nearest_stop_m, total_pop } =
              f.properties;

            const popupContent = `
              <strong>${eup_myeon} ${ri_name}</strong><br/>
              인구: ${total_pop != null ? `${total_pop}명 (추정)` : "–"}<br/>
              고령화율: ${aging_rate != null ? `${aging_rate}%` : "–"}<br/>
              최근접 정류장: ${nearest_stop_m != null ? `${nearest_stop_m}m` : "–"}
            `;
            layer.bindPopup(popupContent);

            /** 마우스 오버 시 해당 법정리를 강조 표시한다. */
            layer.on("mouseover", () => {
              (layer as L.Path).setStyle({ fillOpacity: 0.85, weight: 2 });
            });
            /** 마우스 아웃 시 해당 법정리를 기본 스타일로 되돌린다. */
            layer.on("mouseout", () => {
              (layer as L.Path).setStyle({ fillOpacity: 0.6, weight: 1 });
            });
          },
        }).addTo(map);
      })
      .catch(() => {
        console.warn("GeoJSON 로드 실패: public/data/legal_ri_imsil.geojson 확인 필요");
      });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100vh" }}
    />
  );
}
