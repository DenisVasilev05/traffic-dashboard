import * as echarts from 'echarts';
import type { TrafficRecord } from '../dataLoader';
import { sampleRecords, groupBy } from '../dataLoader';

const WEATHER_COLORS: Record<string, string> = {
  'Clear': '#e6a817', // golden amber — visible on white, semantically sunny
  'Rainy': '#1565c0', // deep blue — rain
  'Foggy': '#607d8b', // darker blue-grey — better contrast for small dots
  'Hot':   '#bf360c', // dark burnt orange — distinct from amber even in deuteranopia
};

const WEATHER_ORDER = ['Clear', 'Rainy', 'Foggy', 'Hot'];

function buildOption(data: TrafficRecord[]): echarts.EChartsOption {
  // Sampling — 2000 representative points
  const sample = sampleRecords(data, 2000);
  const byWeather = groupBy(sample, r => r.weather_condition);

  const series: echarts.ScatterSeriesOption[] = WEATHER_ORDER.map(w => ({
    type: 'scatter' as const,
    name: w,
    data: (byWeather.get(w) ?? []).map(r => [r.traffic_density, r.stress_index]),
    symbolSize: 4,
    itemStyle: {
      color: WEATHER_COLORS[w] ?? '#aaa',
      opacity: 0.65,
    },
    emphasis: { scale: 2 },
  }));

  return {
    legend: {
      top: 2,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => {
        const params = p as { seriesName: string; value: [number, number] };
        return `Weather: ${params.seriesName}<br/>
                Density: ${params.value[0]} veh/km<br/>
                Stress: ${params.value[1].toFixed(1)}`;
      },
    },
    grid: { top: 36, right: 12, bottom: 40, left: 52 },
    xAxis: {
      type: 'value',
      name: 'Traffic Density (veh/km)',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Stress Index',
      nameLocation: 'middle',
      nameGap: 38,
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 },
    },
    series,
  };
}

export function initScatter(container: HTMLElement, data: TrafficRecord[]): (d: TrafficRecord[]) => void {
  const chart = echarts.init(container, null, { renderer: 'canvas' });
  chart.setOption(buildOption(data));
  window.addEventListener('resize', () => chart.resize());

  return function update(d: TrafficRecord[]) {
    chart.setOption(buildOption(d), { replaceMerge: ['series'] });
  };
}
