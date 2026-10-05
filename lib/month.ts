import { addMonths, format, getDaysInMonth } from "date-fns";

export interface MonthRange {
  /** "YYYY-MM", the value used in the `?month=` URL param. */
  key: string;
  label: string;
  /** Inclusive start, 00:00 UTC on the 1st. */
  start: Date;
  /** Exclusive end, 00:00 UTC on the 1st of the next month. */
  end: Date;
  days: number;
  prevKey: string;
  nextKey: string;
  isCurrent: boolean;
}

function keyOf(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Reads `?month=YYYY-MM`, falling back to the current month for anything
 * missing or malformed. Bounds are UTC so the same month means the same
 * rows on the server and in the cache key. */
export function parseMonth(param: string | undefined): MonthRange {
  const now = new Date();
  const currentKey = keyOf(now.getUTCFullYear(), now.getUTCMonth());
  const match = param?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth();

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const prev = addMonths(start, -1);
  const key = keyOf(year, monthIndex);

  return {
    key,
    label: format(new Date(year, monthIndex, 1), "MMMM yyyy"),
    start,
    end,
    days: getDaysInMonth(new Date(year, monthIndex, 1)),
    prevKey: keyOf(prev.getUTCFullYear(), prev.getUTCMonth()),
    nextKey: keyOf(end.getUTCFullYear(), end.getUTCMonth()),
    isCurrent: key === currentKey,
  };
}
