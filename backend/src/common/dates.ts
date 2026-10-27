// Civil dates (YYYY-MM-DD, no time) and time zones. Calculations go through UTC midnight dates,
// which avoids any daylight-saving trouble.

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parts = (civil: string): number[] => civil.split('-').map(Number);

function format(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// True for a real calendar date: "2026-02-30" and "2026-13-01" are refused.
export function isValidCivilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CIVIL_DATE.test(value)) return false;
  const [year, month, day] = parts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDays(civil: string, days: number): string {
  const [year, month, day] = parts(civil);
  return format(new Date(Date.UTC(year, month - 1, day + days)));
}

// Number of days between two civil dates (to - from).
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

// Every day from `from` to `to`, both included (empty when from > to).
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Monday of the week containing this date (weeks run Monday to Sunday).
export function startOfWeek(civil: string): string {
  const [year, month, day] = parts(civil);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return addDays(civil, -((weekday + 6) % 7));
}

export function endOfWeek(civil: string): string {
  return addDays(startOfWeek(civil), 6);
}

export function startOfMonth(civil: string): string {
  const [year, month] = parts(civil);
  return format(new Date(Date.UTC(year, month - 1, 1)));
}

export function endOfMonth(civil: string): string {
  const [year, month] = parts(civil);
  return format(new Date(Date.UTC(year, month, 0)));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// One formatter per time zone, kept because creating them is expensive.
const formatters = new Map<string, Intl.DateTimeFormat>();

// The calendar day (YYYY-MM-DD) of an instant, seen from a time zone.
// 2026-03-01T23:30:00Z is March 1st in New York but already March 2nd in Paris.
export function toCivilDate(instant: Date, timeZone = 'UTC'): string {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, formatter);
  }
  const found = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return `${found.year}-${found.month}-${found.day}`;
}

export function todayIn(timeZone: string, now = new Date()): string {
  return toCivilDate(now, timeZone);
}
