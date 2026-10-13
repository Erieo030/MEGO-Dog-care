import type { WeightRecord } from '../../types';
export function weightTimePositions(items: WeightRecord[], width: number): number[] {
  const stamps = items.map((item) => new Date(item.measuredAt).getTime());
  const first = Math.min(...stamps),
    last = Math.max(...stamps);
  return stamps.map((stamp) =>
    last === first ? width / 2 : ((stamp - first) / (last - first)) * width,
  );
}
