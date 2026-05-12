import './style.css';
import { loadData } from './dataLoader';
import { setSelectedBorough, onBoroughChange, getSelectedBorough } from './brushing';
import { initChoropleth } from './charts/choropleth';
import { initHeatmap }    from './charts/heatmap';
import { initScatter }    from './charts/scatter';
import { initExperienceBar }   from './charts/experienceBar';
import { initCorrelationBar } from './charts/correlationBar';
import type { TrafficRecord } from './dataLoader';

const loading     = document.getElementById('loading')!;
const filterBadge = document.getElementById('filter-badge')!;
const filterLabel = document.getElementById('filter-label')!;
const resetBtn    = document.getElementById('reset-btn')!;

async function main() {
  const allData = await loadData();

  loading.classList.add('hidden');

  const updateChoropleth = initChoropleth(
    document.getElementById('chart-choropleth')!,
    allData,
    (borough) => setSelectedBorough(
      borough === getSelectedBorough() ? null : borough
    ),
  );

  const updateHeatmap  = initHeatmap(document.getElementById('chart-heatmap')!,  allData);
  const updateScatter  = initScatter(document.getElementById('chart-scatter')!,  allData);
  const updateBar      = initExperienceBar(document.getElementById('chart-bar')!,   allData);
  const updateBoxPlot  = initCorrelationBar(document.getElementById('chart-boxplot')!, allData);

  onBoroughChange((borough: string | null) => {
    const filtered: TrafficRecord[] = borough
      ? allData.filter(r => r.district === borough)
      : allData;

    updateChoropleth(borough, filtered);
    updateHeatmap(filtered);
    updateScatter(filtered);
    updateBar(filtered, borough);
    updateBoxPlot(filtered);

    if (borough) {
      filterLabel.textContent = `Showing: ${borough}`;
      filterBadge.classList.remove('hidden');
    } else {
      filterBadge.classList.add('hidden');
    }
  });

  resetBtn.addEventListener('click', () => setSelectedBorough(null));
}

main().catch(err => {
  loading.innerHTML = `<p style="color:red">Failed to load data: ${String(err)}</p>`;
});
