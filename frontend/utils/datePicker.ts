import { localDateKey } from './taipeiDate';

export function dateInRange(value: Date, minimum?: Date, maximum?: Date, dateOnly = false) {
  const key = (date: Date) => (dateOnly ? localDateKey(date) : date.getTime());
  return (
    !Number.isNaN(value.getTime()) &&
    (!minimum || key(value) >= key(minimum)) &&
    (!maximum || key(value) <= key(maximum))
  );
}

export function clampDate(value: Date, minimum?: Date, maximum?: Date, dateOnly = false) {
  const next = new Date(value);
  if (minimum && !dateInRange(next, minimum, undefined, dateOnly)) return new Date(minimum);
  if (maximum && !dateInRange(next, undefined, maximum, dateOnly)) return new Date(maximum);
  return next;
}

export function adjustTimePart(value: number, amount: number, maximum: number) {
  return (value + amount + maximum) % maximum;
}
