// Tests de l'assemblage des événements du calendrier : tâches à faire, tâches terminées (selon le
// fuseau horaire), habitudes réalisées, tri et filtrage par période. Lancer avec : npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendarEvents } from "../src/services/calendarEvents.js";
import { calendarQuerySchema } from "../src/schemas.js";

const range = { from: "2026-10-05", to: "2026-10-11", timeZone: "UTC" };
const none = { dueTasks: [], completedTasks: [], habitEvents: [] };
const at = (iso) => new Date(iso);

const task = (overrides) => ({
  id: "t1",
  title: "Task",
  status: "todo",
  priority: "medium",
  dueDate: null,
  completedAt: null,
  ...overrides,
});

test("sans données, le calendrier est vide", () => {
  assert.deepEqual(buildCalendarEvents({ ...range, ...none }), []);
});

test("une tâche pas terminée apparaît à son échéance (task-due)", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    dueTasks: [task({ id: "a", title: "Pay rent", status: "doing", priority: "high", dueDate: "2026-10-07" })],
  });
  assert.deepEqual(events, [
    { date: "2026-10-07", type: "task-due", title: "Pay rent", taskId: "a", status: "doing", priority: "high" },
  ]);
});

test("les tâches terminées, sans échéance ou hors période n'apparaissent pas comme 'à faire'", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    dueTasks: [
      task({ id: "done", status: "done", dueDate: "2026-10-07" }), // terminée : montrée à sa date de fin
      task({ id: "nodate", dueDate: null }),
      task({ id: "before", dueDate: "2026-10-04" }),
      task({ id: "after", dueDate: "2026-10-12" }),
      task({ id: "first-day", dueDate: "2026-10-05" }), // les bornes sont comprises
      task({ id: "last-day", dueDate: "2026-10-11" }),
    ],
  });
  assert.deepEqual(events.map((e) => e.taskId), ["first-day", "last-day"]);
});

test("une tâche terminée apparaît à sa date de fin (task-done)", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    completedTasks: [task({ id: "c", title: "Ship it", status: "done", completedAt: at("2026-10-08T12:00:00Z") })],
  });
  assert.deepEqual(events.map((e) => [e.date, e.type, e.taskId]), [["2026-10-08", "task-done", "c"]]);
});

test("le fuseau horaire décide du jour d'une tâche terminée", () => {
  // Terminée le dimanche 4 octobre à 23h30 UTC = lundi 5 octobre à 01h30 à Paris.
  const completedTasks = [task({ id: "late", status: "done", completedAt: at("2026-10-04T23:30:00Z") })];

  assert.deepEqual(buildCalendarEvents({ ...range, ...none, completedTasks, timeZone: "UTC" }), []); // 4 oct : hors période
  const paris = buildCalendarEvents({ ...range, ...none, completedTasks, timeZone: "Europe/Paris" });
  assert.deepEqual(paris.map((e) => e.date), ["2026-10-05"]);
});

test("les habitudes réalisées apparaissent avec leur nom, seulement dans la période", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    habitEvents: [
      { date: "2026-10-06", habitId: "h1", habitName: "Morning run" },
      { date: "2026-10-04", habitId: "h1", habitName: "Morning run" },
      { date: "2026-10-12", habitId: "h1", habitName: "Morning run" },
    ],
  });
  assert.deepEqual(events, [{ date: "2026-10-06", type: "habit", title: "Morning run", habitId: "h1" }]);
});

test("tri : par jour, puis tâches à faire, tâches terminées, habitudes, puis par titre", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    dueTasks: [
      task({ id: "b", title: "B task", dueDate: "2026-10-06" }),
      task({ id: "a", title: "A task", dueDate: "2026-10-06" }),
      task({ id: "later", title: "Later", dueDate: "2026-10-09" }),
    ],
    completedTasks: [task({ id: "d", title: "Done", status: "done", completedAt: at("2026-10-06T08:00:00Z") })],
    habitEvents: [{ date: "2026-10-06", habitId: "h", habitName: "Habit" }],
  });
  assert.deepEqual(events.map((e) => `${e.date} ${e.type} ${e.title}`), [
    "2026-10-06 task-due A task",
    "2026-10-06 task-due B task",
    "2026-10-06 task-done Done",
    "2026-10-06 habit Habit",
    "2026-10-09 task-due Later",
  ]);
});

test("paramètres du calendrier : from et to obligatoires, fuseau valide, dans le bon ordre", () => {
  const valid = { from: "2026-09-28", to: "2026-11-08", tz: "Europe/Paris" };
  assert.equal(calendarQuerySchema.safeParse(valid).success, true);
  assert.equal(calendarQuerySchema.safeParse({ from: "2026-09-28", to: "2026-11-08" }).success, true); // tz facultatif
  assert.equal(calendarQuerySchema.safeParse({ from: "2026-09-28" }).success, false);
  assert.equal(calendarQuerySchema.safeParse({}).success, false);
  assert.equal(calendarQuerySchema.safeParse({ ...valid, from: "2026-12-01" }).success, false);
  assert.equal(calendarQuerySchema.safeParse({ ...valid, tz: "Mars/Phobos" }).success, false);
  assert.equal(calendarQuerySchema.safeParse({ ...valid, to: "2026-02-30" }).success, false);
});
