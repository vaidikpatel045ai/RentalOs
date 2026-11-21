/**
 * Dates shown from server components. The server runs on UTC, so a plain
 * date-fns format() would show a 15:00 Dubai shoot as 11:00; these format
 * in the branch's own timezone instead.
 */
const cache = new Map<string, Intl.DateTimeFormat>();

function fmt(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { ...options, timeZone });
    cache.set(key, f);
  }
  return f;
}

/** "21 Nov 2026, 15:00" */
export function zonedDateTime(date: Date, timeZone: string): string {
  return fmt(timeZone, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "Saturday 21 November 2026, 15:00" */
export function zonedLongDateTime(date: Date, timeZone: string): string {
  return fmt(timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "Sat 21 Nov, 15:00" */
export function zonedShortDateTime(date: Date, timeZone: string): string {
  return fmt(timeZone, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "21 Nov 2026" */
export function zonedDate(date: Date, timeZone: string): string {
  return fmt(timeZone, { day: "numeric", month: "short", year: "numeric" }).format(date);
}
