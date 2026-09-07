const DAY_MS = 86_400_000;

type DateInput = Date | string | number;

function milliseconds(value: DateInput) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function rangesOverlap(startA: DateInput, endA: DateInput, startB: DateInput, endB: DateInput) {
  const aStart = milliseconds(startA);
  const aEnd = milliseconds(endA);
  const bStart = milliseconds(startB);
  const bEnd = milliseconds(endB);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite) || aEnd <= aStart || bEnd <= bStart) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function utilisationPercentage(
  intervals: Array<{ startAt: DateInput; endAt: DateInput }>,
  windowStart: DateInput,
  windowEnd: DateInput,
) {
  const start = milliseconds(windowStart);
  const end = milliseconds(windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  const ranges = intervals
    .map((interval) => [Math.max(start, milliseconds(interval.startAt)), Math.min(end, milliseconds(interval.endAt))] as const)
    .filter(([rangeStart, rangeEnd]) => Number.isFinite(rangeStart) && Number.isFinite(rangeEnd) && rangeEnd > rangeStart)
    .sort(([a], [b]) => a - b);

  const merged: Array<[number, number]> = [];
  ranges.forEach(([rangeStart, rangeEnd]) => {
    const previous = merged.at(-1);
    if (!previous || rangeStart > previous[1]) merged.push([rangeStart, rangeEnd]);
    else previous[1] = Math.max(previous[1], rangeEnd);
  });

  const occupied = merged.reduce((total, [rangeStart, rangeEnd]) => total + rangeEnd - rangeStart, 0);
  return Math.round((occupied / (end - start)) * 100);
}

export type CalendarEntry = {
  id: string;
  startAt: DateInput;
  endAt: DateInput;
};

export function layoutCalendarBars<T extends CalendarEntry>(entries: T[], windowStart: DateInput, days: number) {
  const start = milliseconds(windowStart);
  const end = start + days * DAY_MS;
  if (!Number.isFinite(start) || days <= 0) return [];

  return entries.flatMap((entry) => {
    const entryStart = milliseconds(entry.startAt);
    const entryEnd = milliseconds(entry.endAt);
    if (!rangesOverlap(entryStart, entryEnd, start, end)) return [];
    const clippedStart = Math.max(start, entryStart);
    const clippedEnd = Math.min(end, entryEnd);
    const startColumn = Math.floor((clippedStart - start) / DAY_MS) + 1;
    const endColumn = Math.ceil((clippedEnd - start) / DAY_MS) + 1;
    return [{
      ...entry,
      startColumn,
      span: Math.max(1, endColumn - startColumn),
      startsBeforeWindow: entryStart < start,
      endsAfterWindow: entryEnd > end,
    }];
  });
}
