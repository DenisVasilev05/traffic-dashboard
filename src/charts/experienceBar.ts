import * as echarts from 'echarts';
import type { TrafficRecord } from '../dataLoader';
import { avgOf, groupBy } from '../dataLoader';

const EXPERIENCE_ORDER = ['Beginner', 'Intermediate', 'Expert'];

const TIME_BUCKETS = [
  { label: 'Night',      color: '#5c6bc0', test: (h: number) => h <= 5 || h >= 22 },
  { label: 'Rush Hours', color: '#e53935', test: (h: number) => (h >= 7 && h <= 9) || (h >= 16 && h <= 18) },
  { label: 'Daytime',    color: '#f9a825', test: (h: number) => h >= 10 && h <= 15 },
  { label: 'Evening',    color: '#43a047', test: (h: number) => h === 6 || (h >= 19 && h <= 21) },
];

function buildOption(data: TrafficRecord[]): echarts.EChartsOption {
  const byExp = groupBy(data, r => r.driver_experience_level);

  const series: echarts.BarSeriesOption[] = TIME_BUCKETS.map(bucket => {
    const values = EXPERIENCE_ORDER.map(exp => {
      const recs = (byExp.get(exp) ?? []).filter(r => bucket.test(r.hour));
      return recs.length ? parseFloat(avgOf(recs, 'stress_index').toFixed(1)) : 0;
    });
    return {
      type: 'bar' as const,
      name: bucket.label,
      data: values,
      itemStyle: { color: bucket.color },
      barMaxWidth: 32,
    };
  });

  const allValues = series.flatMap(s => s.data as number[]).filter(v => v > 0);
  const yMin = allValues.length ? Math.max(0, Math.floor(Math.min(...allValues)) - 4) : 0;

  return {
    legend: {
      top: 2,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 10 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: unknown) => {
        const params = p as Array<{ seriesName: string; value: number; name: string }>;
        const exp = params[0]?.name ?? '';
        return `<b>${exp}</b><br/>` + params
          .map(s => `${s.seriesName}: ${s.value}`)
          .join('<br/>');
      },
    },
    grid: { top: 36, right: 8, bottom: 36, left: 50 },
    xAxis: {
      type: 'category',
      data: EXPERIENCE_ORDER,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'Average Stress',
      nameLocation: 'middle',
      nameGap: 36,
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 },
      min: yMin,
    },
    series,
  };
}

export function initExperienceBar(
  container: HTMLElement,
  data: TrafficRecord[],
): (d: TrafficRecord[], borough: string | null) => void {
  const chart = echarts.init(container, null, { renderer: 'canvas' });
  chart.setOption(buildOption(data));
  window.addEventListener('resize', () => chart.resize());

  return function update(d: TrafficRecord[], _borough: string | null) {
    chart.setOption(buildOption(d), { replaceMerge: ['series'] });
  };
}
