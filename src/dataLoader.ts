import Papa from 'papaparse';
import { CITY } from './cityConfig';

export interface TrafficRecord {
  traffic_density: number;
  horn_events_per_min: number;
  avg_speed: number;
  signal_wait_time: number;
  weather_condition: string;
  road_quality_score: number;
  driver_experience_level: string;
  stress_index: number;
  district: string;
  hour: number;
  day_of_week: string;
}

// Per-hour traffic volume weights — shape drives how many records land in each bin
// Weekdays: twin peaks at 8 AM and 17 PM (rush hours)
const WEEKDAY_W = [
  0.20, 0.15, 0.10, 0.10, 0.20, 0.55,  // 00-05: overnight → early risers
  1.00, 2.80, 3.20, 2.10, 1.50, 1.40,  // 06-11: morning rush peaks at 08
  1.50, 1.45, 1.45, 1.80, 2.70, 3.20,  // 12-17: afternoon rush peaks at 17
  2.60, 1.90, 1.30, 1.00, 0.65, 0.35,  // 18-23: evening taper
];
// Weekends: single midday plateau, no rush peaks
const WEEKEND_W = [
  0.25, 0.15, 0.10, 0.10, 0.15, 0.30,  // 00-05
  0.55, 0.80, 1.05, 1.55, 1.90, 2.10,  // 06-11: slow morning rise
  2.20, 2.20, 2.10, 2.05, 1.90, 1.75,  // 12-17: midday plateau
  1.55, 1.35, 1.15, 0.95, 0.60, 0.30,  // 18-23
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS = ['Sat', 'Sun'];

type WeightedSlot = { hour: number; day_of_week: string; w: number };

function buildTimeSlots(n: number): WeightedSlot[] {
  const totalW =
    WEEKDAYS.length * WEEKDAY_W.reduce((s, w) => s + w, 0) +
    WEEKENDS.length * WEEKEND_W.reduce((s, w) => s + w, 0);

  const all: WeightedSlot[] = [];

  for (const day of WEEKDAYS) {
    for (let h = 0; h < 24; h++) {
      const count = Math.round((WEEKDAY_W[h] / totalW) * n);
      for (let j = 0; j < count; j++) all.push({ hour: h, day_of_week: day, w: WEEKDAY_W[h] });
    }
  }
  for (const day of WEEKENDS) {
    for (let h = 0; h < 24; h++) {
      const count = Math.round((WEEKEND_W[h] / totalW) * n);
      for (let j = 0; j < count; j++) all.push({ hour: h, day_of_week: day, w: WEEKEND_W[h] });
    }
  }

  // Pad or trim to exactly n slots
  while (all.length < n) all.push({ hour: 12, day_of_week: 'Mon', w: 1.5 });
  all.length = n;

  // Rush-hour slots first → will be paired with highest-traffic-density records
  all.sort((a, b) => b.w - a.w);
  return all;
}

export async function loadData(): Promise<TrafficRecord[]> {
  const response = await fetch('/data/smart_city_traffic_stress_dataset.csv');
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete(results) {
        const n = results.data.length;
        const slots = buildTimeSlots(n);

        // Sort record indices by traffic_density descending so that the
        // highest-traffic records receive rush-hour time slots
        const order = results.data
          .map((row, i) => ({ i, td: Number(row['traffic_density']) }))
          .sort((a, b) => b.td - a.td);

        const slotFor = new Map<number, WeightedSlot>();
        order.forEach(({ i }, si) => slotFor.set(i, slots[si]));

        const records: TrafficRecord[] = results.data.map((row, i) => {
          const slot = slotFor.get(i)!;
          return {
            traffic_density:         Number(row['traffic_density']),
            horn_events_per_min:     Number(row['horn_events_per_min']),
            avg_speed:               Number(row['avg_speed']),
            signal_wait_time:        Number(row['signal_wait_time']),
            weather_condition:       String(row['weather_condition']).trim(),
            road_quality_score:      Number(row['road_quality_score']),
            driver_experience_level: String(row['driver_experience_level']).trim(),
            stress_index:            Number(row['stress_index']),
            district:                CITY.districts[i % CITY.districts.length],
            hour:                    slot.hour,
            day_of_week:             slot.day_of_week,
          };
        });

        resolve(records);
      },
      error(err: Error) { reject(err); },
    });
  });
}

export function sampleRecords(records: TrafficRecord[], n: number): TrafficRecord[] {
  if (records.length <= n) return records;
  const step = records.length / n;
  return Array.from({ length: n }, (_, i) => records[Math.floor(i * step)]);
}

export function groupBy<T>(
  records: T[],
  key: (r: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of records) {
    const k = key(r);
    const bucket = map.get(k);
    if (bucket) bucket.push(r);
    else map.set(k, [r]);
  }
  return map;
}

export function avgOf(records: TrafficRecord[], field: keyof TrafficRecord): number {
  if (records.length === 0) return 0;
  const sum = records.reduce((s, r) => s + (r[field] as number), 0);
  return sum / records.length;
}

export function boxStats(values: number[]): [number, number, number, number, number] {
  if (values.length === 0) return [0, 0, 0, 0, 0];
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const q1  = s[Math.floor(n * 0.25)];
  const med = s[Math.floor(n * 0.50)];
  const q3  = s[Math.floor(n * 0.75)];
  return [s[0], q1, med, q3, s[n - 1]];
}
