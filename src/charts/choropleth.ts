import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrafficRecord } from '../dataLoader';
import { avgOf, groupBy } from '../dataLoader';
import { CITY } from '../cityConfig';

// #fff7bc → #fd8d3c → #800026
function stressColor(t: number): string {
  const stops: [number, number, number][] = [[255, 247, 188], [253, 141, 60], [128, 0, 38]];
  const seg = Math.min(Math.floor(t * 2), 1);
  const tt = t * 2 - seg;
  const [r1, g1, b1] = stops[seg];
  const [r2, g2, b2] = stops[seg + 1];
  return `rgb(${Math.round(r1 + (r2 - r1) * tt)},${Math.round(g1 + (g2 - g1) * tt)},${Math.round(b1 + (b2 - b1) * tt)})`;
}

function boroughStyle(
  name: string,
  avgStress: Map<string, number>,
  minV: number,
  maxV: number,
  selected: string | null,
): L.PathOptions {
  const val = avgStress.get(name) ?? 0;
  const t = maxV > minV ? (val - minV) / (maxV - minV) : 0.5;
  return {
    fillColor: stressColor(t),
    fillOpacity: name === selected ? 0.9 : 0.65,
    color: name === selected ? '#1565c0' : '#555',
    weight: name === selected ? 3 : 1,
  };
}

export function initChoropleth(
  container: HTMLElement,
  allData: TrafficRecord[],
  onSelect: (borough: string | null) => void,
): (borough: string | null, filteredData: TrafficRecord[]) => void {
  const districtNames = [...new Set(CITY.districts)];
  const leafletMap = L.map(container).setView(CITY.mapCenter, CITY.mapZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(leafletMap);

  const byBorough = groupBy(allData, r => r.district);
  const avgStress = new Map<string, number>(
    districtNames.map(n => [n, parseFloat(avgOf(byBorough.get(n) ?? [], 'stress_index').toFixed(1))])
  );
  const vals = [...avgStress.values()].filter(v => v > 0);
  const minV = vals.length ? Math.min(...vals) : 0;
  const maxV = vals.length ? Math.max(...vals) : 100;

  let currentBorough: string | null = null;
  const pathLayers = new Map<string, L.Path>();

  fetch(CITY.geojsonPath)
    .then(r => r.json())
    .then((geoJson: unknown) => {
      L.geoJSON(geoJson as Parameters<typeof L.geoJSON>[0], {
        style: feature => boroughStyle(
          (feature?.properties as { name: string } | null)?.name ?? '',
          avgStress, minV, maxV, currentBorough,
        ),
        onEachFeature(feature, layer) {
          const name: string = (feature.properties as { name: string } | null)?.name ?? '';
          pathLayers.set(name, layer as L.Path);
          layer.bindTooltip(
            `<b>${name}</b><br/>Average Stress: ${avgStress.get(name) ?? 0}`,
            { sticky: true },
          );
          layer.on('click', () => onSelect(name));
        },
      }).addTo(leafletMap);
    });

  window.addEventListener('resize', () => leafletMap.invalidateSize());

  return function update(borough: string | null, _filteredData: TrafficRecord[]) {
    currentBorough = borough;
    pathLayers.forEach((path, name) => {
      path.setStyle(boroughStyle(name, avgStress, minV, maxV, borough));
    });
  };
}
