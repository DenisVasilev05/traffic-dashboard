import * as echarts from 'echarts';
import type { TrafficRecord } from '../dataLoader';

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

function buildOption(data: TrafficRecord[]): echarts.EChartsOption {
  // Aggregate: avg stress per (day, hour) — binning strategy
  const bins = new Map<string, number[]>();
  for (const r of data) {
    const key = `${r.day_of_week}|${r.hour}`;
    const bucket = bins.get(key);
    if (bucket) bucket.push(r.stress_index);
    else bins.set(key, [r.stress_index]);
  }

  const heatData: [number, number, number][] = [];
  for (let di = 0; di < DAYS.length; di++) {
    for (let h = 0; h < 24; h++) {
      const vals = bins.get(`${DAYS[di]}|${h}`) ?? [];
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      heatData.push([h, di, parseFloat(avg.toFixed(1))]);
    }
  }

  const nonZero = heatData.map(d => d[2]).filter(v => v > 0);
  const minV = nonZero.length ? Math.min(...nonZero) : 0;
  const maxV = nonZero.length ? Math.max(...nonZero) : 100;

  return {
    tooltip: {
      position: 'top',
      formatter: (p: unknown) => {
        const params = p as { value: [number, number, number] };
        const [h, di, v] = params.value;
        return `${DAYS[di]} ${HOURS[h]}<br/>Average Stress: <b>${v}</b>`;
      },
    },
    grid: { top: 10, right: 60, bottom: 60, left: 50 },
    xAxis: {
      type: 'category',
      data: HOURS,
      splitArea: { show: true },
      axisLabel: {
        interval: 2,
        fontSize: 10,
        formatter: (v: string) => v.replace(':00', 'h'),
      },
    },
    yAxis: {
      type: 'category',
      data: DAYS,
      splitArea: { show: true },
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      min: minV,
      max: maxV,
      calculable: true,
      orient: 'vertical',
      right: 0,
      top: 'center',
      inRange: { color: ['#fff7bc', '#fd8d3c', '#800026'] },
      textStyle: { fontSize: 10 },
    },
    series: [{
      type: 'heatmap',
      data: heatData,
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  };
}

export function initHeatmap(container: HTMLElement, data: TrafficRecord[]): (d: TrafficRecord[]) => void {
  const chart = echarts.init(container, null, { renderer: 'canvas' });
  chart.setOption(buildOption(data));
  window.addEventListener('resize', () => chart.resize());

  return function update(d: TrafficRecord[]) {
    chart.setOption(buildOption(d), { replaceMerge: ['series'] });
  };
}
