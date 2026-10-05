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

test("chaque événement de tâche porte son statut (à faire, en cours, terminée), qui décide de sa couleur", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    dueTasks: [
      task({ id: "t", title: "Todo", status: "todo", dueDate: "2026-10-06" }),
      task({ id: "d", title: "Doing", status: "doing", dueDate: "2026-10-06" }),
    ],
    undatedTasks: [task({ id: "u", title: "Undated", status: "doing", createdAt: at("2026-10-07T10:00:00Z") })],
    completedTasks: [task({ id: "c", title: "Done", status: "done", completedAt: at("2026-10-06T10:00:00Z") })],
  });
  assert.deepEqual(events.map((e) => [e.title, e.status]), [
    ["Doing", "doing"],
    ["Todo", "todo"],
    ["Done", "done"],
    ["Undated", "doing"],
  ]);
});

test("une tâche ouverte sans échéance apparaît le jour où elle a été ajoutée (task-undated)", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    undatedTasks: [task({ id: "n", title: "No date", status: "todo", priority: "high", createdAt: at("2026-10-08T09:00:00Z") })],
  });
  assert.deepEqual(events, [
    { date: "2026-10-08", type: "task-undated", title: "No date", taskId: "n", status: "todo", priority: "high" },
  ]);
});

test("task-undated : ignore les tâches terminées, celles qui ont une échéance, et celles créées hors période", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    undatedTasks: [
      task({ id: "done", status: "done", createdAt: at("2026-10-08T09:00:00Z") }), // terminée : montrée à sa date de fin
      task({ id: "dated", status: "todo", dueDate: "2026-10-09", createdAt: at("2026-10-08T09:00:00Z") }), // a une échéance
      task({ id: "before", status: "todo", createdAt: at("2026-10-04T09:00:00Z") }),
      task({ id: "after", status: "todo", createdAt: at("2026-10-12T09:00:00Z") }),
      task({ id: "ok", status: "doing", createdAt: at("2026-10-05T09:00:00Z") }), // première journée comprise
    ],
  });
  assert.deepEqual(events.map((e) => e.taskId), ["ok"]);
});

test("le fuseau horaire décide du jour d'ajout d'une tâche sans échéance", () => {
  // Ajoutée le dimanche 4 octobre à 23h30 UTC = lundi 5 octobre à 01h30 à Paris.
  const undatedTasks = [task({ id: "late", status: "todo", createdAt: at("2026-10-04T23:30:00Z") })];

  assert.deepEqual(buildCalendarEvents({ ...range, ...none, undatedTasks, timeZone: "UTC" }), []); // 4 oct : hors période
  const paris = buildCalendarEvents({ ...range, ...none, undatedTasks, timeZone: "Europe/Paris" });
  assert.deepEqual(paris.map((e) => e.date), ["2026-10-05"]);
});

test("une tâche en retard dont l'échéance est avant la période est reportée sur aujourd'hui (task-overdue)", () => {
  // Période : du 5 au 11 octobre ; aujourd'hui = 7 octobre ; la tâche était due le 27 septembre.
  const events = buildCalendarEvents({
    ...range,
    ...none,
    today: "2026-10-07",
    overdueTasks: [task({ id: "o", title: "Old one", status: "doing", priority: "high", dueDate: "2026-09-27" })],
  });
  assert.deepEqual(events, [
    {
      date: "2026-10-07", // reportée sur aujourd'hui
      type: "task-overdue",
      title: "Old one",
      taskId: "o",
      status: "doing", // garde le statut (donc sa couleur)
      priority: "high",
      dueDate: "2026-09-27", // et sa vraie échéance
    },
  ]);
});

test("task-overdue : pas de report si aujourd'hui est hors période, ni pour les tâches terminées ou déjà visibles", () => {
  const overdueTasks = [
    task({ id: "old", status: "todo", dueDate: "2026-09-27" }),
    task({ id: "done", status: "done", dueDate: "2026-09-27" }),
    task({ id: "visible", status: "todo", dueDate: "2026-10-05" }), // dans la période : déjà affichée à sa date
    task({ id: "nodate", status: "todo", dueDate: null }),
  ];

  // Aujourd'hui (20 octobre) n'est pas dans la période du 5 au 11 : rien à reporter.
  assert.deepEqual(buildCalendarEvents({ ...range, ...none, today: "2026-10-20", overdueTasks }), []);
  // Aujourd'hui dans la période : seule la tâche ouverte, en retard et hors période est reportée.
  const events = buildCalendarEvents({ ...range, ...none, today: "2026-10-07", overdueTasks });
  assert.deepEqual(events.map((e) => e.taskId), ["old"]);
});

test("les tâches en retard déjà dans la période ne sont pas dupliquées (affichées à leur échéance)", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    today: "2026-10-09",
    dueTasks: [task({ id: "late", title: "Late", status: "todo", dueDate: "2026-10-06" })], // en retard, mais visible le 6
  });
  assert.deepEqual(events.map((e) => [e.date, e.type]), [["2026-10-06", "task-due"]]);
});

test("les tâches en retard reportées passent avant les autres événements du jour", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    today: "2026-10-07",
    overdueTasks: [task({ id: "o", title: "Zzz overdue", dueDate: "2026-09-01" })],
    dueTasks: [task({ id: "d", title: "Aaa due today", dueDate: "2026-10-07" })],
    habitEvents: [{ date: "2026-10-07", habitId: "h", habitName: "Habit" }],
  });
  assert.deepEqual(events.map((e) => e.type), ["task-overdue", "task-due", "habit"]);
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

test("tri : par jour, puis à faire avec échéance, sans échéance, terminées, habitudes, puis par titre", () => {
  const events = buildCalendarEvents({
    ...range,
    ...none,
    dueTasks: [
      task({ id: "b", title: "B task", dueDate: "2026-10-06" }),
      task({ id: "a", title: "A task", dueDate: "2026-10-06" }),
      task({ id: "later", title: "Later", dueDate: "2026-10-09" }),
    ],
    undatedTasks: [task({ id: "u", title: "Undated", createdAt: at("2026-10-06T08:00:00Z") })],
    completedTasks: [task({ id: "d", title: "Done", status: "done", completedAt: at("2026-10-06T08:00:00Z") })],
    habitEvents: [{ date: "2026-10-06", habitId: "h", habitName: "Habit" }],
  });
  assert.deepEqual(events.map((e) => `${e.date} ${e.type} ${e.title}`), [
    "2026-10-06 task-due A task",
    "2026-10-06 task-due B task",
    "2026-10-06 task-undated Undated",
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
