// Assembles the calendar events. Like stats.calculations.ts this file holds only pure functions (no database),
// so they can be tested (see calendar.events.spec.ts).
//
// The calendar shows five kinds of events:
// - "task-due"      : a task not finished yet (todo or doing) on its due date
// - "task-overdue"  : an overdue task whose due date is BEFORE the displayed period. Its date is not visible,
//                     so it is carried onto today (if today is in the period) and keeps its real due date in "dueDate"
// - "task-undated"  : an unfinished task WITHOUT a due date, shown on the day it was added (seen from the user's
//                     time zone) so that it still appears
// - "task-done"     : a finished task, on its completion day
// - "habit"         : a habit done that day
// Each task event carries its "status" (todo, doing or done), which decides the colour in the apps.
// A finished task only appears on its completion date, not on its due date.
import { toCivilDate } from '../common/dates';
import type { TaskPriority, TaskStatus } from '../tasks/task.schemas';

export type CalendarTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt?: Date;
  completedAt: Date | null;
};

export type CalendarEventType = 'task-due' | 'task-overdue' | 'task-undated' | 'task-done' | 'habit';

export type CalendarEvent = {
  date: string;
  type: CalendarEventType;
  title: string;
  taskId?: string;
  habitId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
};

// Display order of the events of one day.
const TYPE_ORDER: Record<CalendarEventType, number> = {
  'task-overdue': 0,
  'task-due': 1,
  'task-undated': 2,
  'task-done': 3,
  habit: 4,
};

// The events between `from` and `to` (civil dates, both included), sorted by day, then type, then title.
// `today` is today's date in the user's time zone.
export function buildCalendarEvents(input: {
  from: string;
  to: string;
  today?: string;
  timeZone: string;
  dueTasks: CalendarTask[];
  overdueTasks?: CalendarTask[];
  undatedTasks?: CalendarTask[];
  completedTasks: CalendarTask[];
  habitEvents: { date: string; habitId: string; habitName: string }[];
}): CalendarEvent[] {
  const { from, to, today, timeZone, dueTasks, overdueTasks = [], undatedTasks = [], completedTasks, habitEvents } = input;
  const events: CalendarEvent[] = [];
  const taskEvent = (type: CalendarEventType, date: string, task: CalendarTask): CalendarEvent => ({
    date,
    type,
    title: task.title,
    taskId: task.id,
    status: task.status,
    priority: task.priority,
  });

  for (const task of dueTasks) {
    // Finished tasks are shown on their completion date (below), not on their due date.
    if (task.status === 'done' || !task.dueDate) continue;
    if (task.dueDate < from || task.dueDate > to) continue;
    events.push(taskEvent('task-due', task.dueDate, task));
  }

  // Overdue tasks due before the period are carried onto today, but only if today is in the displayed
  // period (otherwise there is nowhere to show them).
  if (today && today >= from && today <= to) {
    for (const task of overdueTasks) {
      if (task.status === 'done' || !task.dueDate || task.dueDate >= from) continue;
      events.push({ ...taskEvent('task-overdue', today, task), dueDate: task.dueDate });
    }
  }

  for (const task of undatedTasks) {
    // Only open tasks without a due date are placed on their creation day.
    if (task.status === 'done' || task.dueDate || !task.createdAt) continue;
    // The creation day depends on the time zone: 23:30 UTC can already be tomorrow in Paris.
    const date = toCivilDate(task.createdAt, timeZone);
    if (date < from || date > to) continue;
    events.push(taskEvent('task-undated', date, task));
  }

  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    const date = toCivilDate(task.completedAt, timeZone);
    if (date < from || date > to) continue;
    events.push(taskEvent('task-done', date, task));
  }

  for (const event of habitEvents) {
    if (event.date < from || event.date > to) continue;
    events.push({ date: event.date, type: 'habit', title: event.habitName, habitId: event.habitId });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.title.localeCompare(b.title),
  );
}
