// Statistics calculations (heatmap and completion rate). Only "pure" functions: they take plain data and
// return a result without touching the database, so they are easy to test (see stats.calculations.spec.ts).
//
// Definitions:
// - Day of a completed task: the instant `completedAt` converted to a calendar day in the user's time zone.
//   A task finished at 23:30 UTC on March 1st counts for March 2nd in Paris, but March 1st in New York.
// - Day of a completed habit: the civil date recorded (already in the user's calendar).
// - Period: a week (Monday to Sunday) or a calendar month, always computed on civil dates.
// - Workload of a period: tasks "in play" during it, created on or before its last day AND not completed
//   before its first day.
// - Completed in a period: tasks whose completion day falls inside it.
// - Completion rate = completed / workload (0 to 1). With no task in play the rate is null (not 0).
// - Change = rate minus the previous period's rate (null if either is null).
//
// Known limit: reopening a completed task clears its completion date, so it stops counting as completed in
// the past (the history of reopenings is not kept).
import { addDays, eachDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek, toCivilDate } from '../common/dates';

export type Period = { start: string; end: string };
export type HeatmapDay = { date: string; tasks: number; habits: number; total: number; level: number };
export type CompletionItem = Period & {
  completed: number;
  workload: number;
  rate: number | null;
  change: number | null;
  habitCompletions: number;
};

// Rounds to 4 decimals to avoid results like 0.30000000000000004.
const round = (value: number) => Math.round(value * 10000) / 10000;

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

// Heatmap intensity of a cell, from 0 (no activity) to 4 (the busiest day). Levels 1 to 4 are
// proportional to the maximum of the displayed period.
export function levelFor(total: number, max: number): number {
  if (total <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((total / max) * 4));
}

// One entry per day between `from` and `to` (both included), zero days too.
export function buildHeatmap(input: {
  from: string;
  to: string;
  taskCompletedAts: Date[];
  habitDates: string[];
  timeZone: string;
}): { days: HeatmapDay[]; max: number } {
  const tasksPerDay = new Map<string, number>();
  const habitsPerDay = new Map<string, number>();
  for (const completedAt of input.taskCompletedAts) increment(tasksPerDay, toCivilDate(completedAt, input.timeZone));
  for (const date of input.habitDates) increment(habitsPerDay, date);

  const days = eachDay(input.from, input.to).map((date) => {
    const tasks = tasksPerDay.get(date) ?? 0;
    const habits = habitsPerDay.get(date) ?? 0;
    return { date, tasks, habits, total: tasks + habits };
  });

  const max = days.reduce((highest, day) => Math.max(highest, day.total), 0);
  return { days: days.map((day) => ({ ...day, level: levelFor(day.total, max) })), max };
}

// The last `count` periods (weeks or months), oldest first, ending with the one containing `today`.
export function buildPeriods(today: string, period: 'week' | 'month', count: number): Period[] {
  const isMonth = period === 'month';
  const periods: Period[] = [];
  let start = isMonth ? startOfMonth(today) : startOfWeek(today);
  for (let i = 0; i < count; i++) {
    periods.unshift({ start, end: isMonth ? endOfMonth(start) : endOfWeek(start) });
    // The previous period starts 7 days earlier (week) or at the start of the month before (month).
    start = isMonth ? startOfMonth(addDays(start, -1)) : addDays(start, -7);
  }
  return periods;
}

export function completionByPeriod(input: {
  tasks: { createdAt: Date; completedAt: Date | null }[];
  habitDates?: string[];
  periods: Period[];
  timeZone: string;
}): CompletionItem[] {
  const { tasks, habitDates = [], periods, timeZone } = input;
  // Each instant is converted to a civil day once, not again for every period.
  const dated = tasks.map((task) => ({
    created: toCivilDate(task.createdAt, timeZone),
    completed: task.completedAt ? toCivilDate(task.completedAt, timeZone) : null,
  }));

  let previousRate: number | null = null;
  return periods.map(({ start, end }) => {
    const completed = dated.filter((t) => t.completed && t.completed >= start && t.completed <= end).length;
    const workload = dated.filter((t) => t.created <= end && (!t.completed || t.completed >= start)).length;
    const habitCompletions = habitDates.filter((date) => date >= start && date <= end).length;

    const rate = workload > 0 ? round(completed / workload) : null;
    const change = rate !== null && previousRate !== null ? round(rate - previousRate) : null;
    previousRate = rate;

    return { start, end, completed, workload, rate, change, habitCompletions };
  });
}
