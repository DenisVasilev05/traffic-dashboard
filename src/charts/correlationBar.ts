import * as echarts from 'echarts';
import type { TrafficRecord } from '../dataLoader';
import { groupBy } from '../dataLoader';

const NUMERIC_VARS: { key: keyof TrafficRecord; label: string; desc: string }[] = [
  { key: 'traffic_density',     label: 'Traffic Density',  desc: 'More traffic'   },
  { key: 'signal_wait_time',    label: 'Signal Wait Time', desc: 'Longer waits'   },
  { key: 'horn_events_per_min', label: 'Horn Events/min',  desc: 'More honking'   },
  { key: 'avg_speed',           label: 'Average Speed',    desc: 'Higher speed'   },
  { key: 'road_quality_score',  label: 'Road Quality',     desc: 'Better roads'   },
];

const COLOR_POS = '#bf360c';
const COLOR_NEG = '#1565c0';
const COLOR_ETA = '#546e7a';

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  return dx2 && dy2 ? num / Math.sqrt(dx2 * dy2) : 0;
}

function etaSquared(data: TrafficRecord[], stress: number[]): number {
  const grandMean = stress.reduce((a, b) => a + b, 0) / stress.length;
  const ssTotal   = stress.reduce((s, v) => s + (v - grandMean) ** 2, 0);
  if (ssTotal === 0) return 0;
  const byWeather = groupBy(data, r => r.weather_condition);
  const ssBetween = [...byWeather.values()].reduce((s, recs) => {
    const gMean = recs.reduce((a, r) => a + r.stress_index, 0) / recs.length;
    return s + recs.length * (gMean - grandMean) ** 2;
  }, 0);
  return ssBetween / ssTotal;
}

type CorrItem = { label: string; r: number; type: 'pearson' | 'eta'; desc: string };

function buildOption(data: TrafficRecord[]): echarts.EChartsOption {
  const stress = data.map(r => r.stress_index);

  const corrs: CorrItem[] = [
    ...NUMERIC_VARS.map(v => ({
      label: v.label,
      r:     parseFloat(pearson(data.map(r => r[v.key] as number), stress).toFixed(3)),
      type:  'pearson' as const,
      desc:  v.desc,
    })),
    {
      label: 'Weather Condition',
      r:     parseFloat(etaSquared(data, stress).toFixed(3)),
      type:  'eta' as const,
      desc:  '',
    },
  ].sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: unknown) => {
        const params = p as Array<{ name: string; value: number; dataIndex: number }>;
        const { name, value, dataIndex } = params[0];
        const item = corrs[dataIndex];
        if (item.type === 'eta') {
          return `<b>${name}</b><br/>Association: ${value.toFixed(3)}`
               + `<br/><i>Explains ${(value * 100).toFixed(1)}% of stress variance</i>`;
        }
        const stressDir = value >= 0 ? 'more stress' : 'less stress';
        return `<b>${name}</b><br/>Correlation: ${value >= 0 ? '+' : ''}${value.toFixed(3)}`
             + `<br/><i>${item.desc} → ${stressDir}</i>`;
      },
    },
    grid: { top: 12, right: 48, bottom: 40, left: 130 },
    xAxis: {
      type: 'value',
      min: -1,
      max: 1,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' } },
      name: 'Correlation with stress index',
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: { fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: corrs.map(c => c.label),
      axisLabel: { fontSize: 10 },
      inverse: true,
    },
    series: [{
      type: 'bar',
      data: corrs.map(c => {
        // Enforce a minimum visible stub for near-zero values so the label always renders
        const displayValue = (c.type === 'eta' && Math.abs(c.r) < 0.01) ? 0.02 : c.r;
        const labelText = c.type === 'eta'
          ? (c.r < 0.005 ? '< 0.01' : c.r.toFixed(2))
          : (c.r >= 0 ? `+${c.r.toFixed(2)}` : c.r.toFixed(2));
        return {
          value: displayValue,
          itemStyle: {
            color: c.type === 'eta' ? COLOR_ETA : (c.r >= 0 ? COLOR_POS : COLOR_NEG),
          },
          label: {
            show: true,
            position: c.type === 'eta' ? 'right' : 'inside',
            color: c.type === 'eta' ? '#333' : '#fff',
            formatter: () => labelText,
            fontSize: 10,
          },
        };
      }),
      barMaxWidth: 36,
    }],
  };
}

export function initCorrelationBar(
  container: HTMLElement,
  data: TrafficRecord[],
): (d: TrafficRecord[]) => void {
  const chart = echarts.init(container, null, { renderer: 'canvas' });
  chart.setOption(buildOption(data));
  window.addEventListener('resize', () => chart.resize());

  return function update(d: TrafficRecord[]) {
    chart.setOption(buildOption(d), { replaceMerge: ['series'] });
  };
}
