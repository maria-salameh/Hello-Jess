// Tests des calculs de statistiques : niveaux de la heatmap, jours à zéro, fuseaux horaires,
// découpage en périodes et taux de complétion. Les définitions sont dans statsCalculations.js.
// Lancer avec : npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHeatmap, buildPeriods, completionByPeriod, levelFor } from "../src/services/statsCalculations.js";

const at = (iso) => new Date(iso);

// ----- Heatmap -----

test("levelFor : 0 sans activité, puis 1 à 4 proportionnellement au jour le plus actif", () => {
  assert.equal(levelFor(0, 5), 0);
  assert.equal(levelFor(5, 0), 0);
  assert.equal(levelFor(1, 4), 1);
  assert.equal(levelFor(2, 4), 2);
  assert.equal(levelFor(3, 4), 3);
  assert.equal(levelFor(4, 4), 4);
  assert.equal(levelFor(1, 100), 1); // une toute petite activité reste visible (niveau 1)
  assert.equal(levelFor(50, 100), 2);
  assert.equal(levelFor(51, 100), 3);
  assert.equal(levelFor(100, 100), 4);
});

test("buildHeatmap renvoie un jour par date, y compris les jours à zéro", () => {
  const { days, max } = buildHeatmap({
    from: "2026-03-01",
    to: "2026-03-04",
    taskCompletedAts: [at("2026-03-01T23:30:00Z"), at("2026-03-02T10:00:00Z"), at("2026-03-02T11:00:00Z")],
    habitDates: ["2026-03-02", "2026-03-04"],
    timeZone: "UTC",
  });

  assert.equal(days.length, 4);
  assert.deepEqual(days, [
    { date: "2026-03-01", tasks: 1, habits: 0, total: 1, level: 2 },
    { date: "2026-03-02", tasks: 2, habits: 1, total: 3, level: 4 },
    { date: "2026-03-03", tasks: 0, habits: 0, total: 0, level: 0 }, // jour à zéro conservé
    { date: "2026-03-04", tasks: 0, habits: 1, total: 1, level: 2 },
  ]);
  assert.equal(max, 3);
});

test("buildHeatmap : le fuseau horaire déplace une tâche terminée vers le jour local", () => {
  const input = {
    from: "2026-03-01",
    to: "2026-03-02",
    taskCompletedAts: [at("2026-03-01T23:30:00Z")],
    habitDates: [],
  };

  // En UTC, la tâche compte pour le 1er mars.
  const utc = buildHeatmap({ ...input, timeZone: "UTC" });
  assert.deepEqual(utc.days.map((d) => d.tasks), [1, 0]);

  // À Paris il est déjà 00h30 le 2 mars : la tâche compte pour le 2 mars.
  const paris = buildHeatmap({ ...input, timeZone: "Europe/Paris" });
  assert.deepEqual(paris.days.map((d) => d.tasks), [0, 1]);

  // À New York il est 18h30 le 1er mars : comme en UTC.
  const newYork = buildHeatmap({ ...input, timeZone: "America/New_York" });
  assert.deepEqual(newYork.days.map((d) => d.tasks), [1, 0]);
});

test("buildHeatmap ignore ce qui est hors de la période et gère une période sans activité", () => {
  const outside = buildHeatmap({
    from: "2026-03-01",
    to: "2026-03-02",
    taskCompletedAts: [at("2026-02-28T12:00:00Z"), at("2026-03-10T12:00:00Z")],
    habitDates: ["2026-02-28", "2026-03-10"],
    timeZone: "UTC",
  });
  assert.deepEqual(outside.days.map((d) => d.total), [0, 0]);
  assert.equal(outside.max, 0);
  assert.deepEqual(outside.days.map((d) => d.level), [0, 0]);
});

test("buildHeatmap : une année complète contient 365 jours (366 en année bissextile)", () => {
  const empty = { taskCompletedAts: [], habitDates: [], timeZone: "UTC" };
  assert.equal(buildHeatmap({ ...empty, from: "2026-01-01", to: "2026-12-31" }).days.length, 365);
  assert.equal(buildHeatmap({ ...empty, from: "2024-01-01", to: "2024-12-31" }).days.length, 366);
});

// ----- Périodes -----

test("buildPeriods (semaines) : de la plus ancienne à celle qui contient aujourd'hui", () => {
  // Le 7 octobre 2026 est un mercredi.
  assert.deepEqual(buildPeriods("2026-10-07", "week", 3), [
    { start: "2026-09-21", end: "2026-09-27" },
    { start: "2026-09-28", end: "2026-10-04" },
    { start: "2026-10-05", end: "2026-10-11" },
  ]);
});

test("buildPeriods (mois) : gère la longueur des mois et le changement d'année", () => {
  assert.deepEqual(buildPeriods("2026-10-17", "month", 3), [
    { start: "2026-08-01", end: "2026-08-31" },
    { start: "2026-09-01", end: "2026-09-30" },
    { start: "2026-10-01", end: "2026-10-31" },
  ]);
  assert.deepEqual(buildPeriods("2026-01-15", "month", 2), [
    { start: "2025-12-01", end: "2025-12-31" },
    { start: "2026-01-01", end: "2026-01-31" },
  ]);
  assert.deepEqual(buildPeriods("2026-01-01", "week", 1), [{ start: "2025-12-29", end: "2026-01-04" }]);
});

// ----- Taux de complétion -----

// Deux semaines : S1 = du 28/09 au 04/10/2026, S2 = du 05/10 au 11/10/2026.
const weeks = [
  { start: "2026-09-28", end: "2026-10-04" },
  { start: "2026-10-05", end: "2026-10-11" },
];

// A : créée avant S1, terminée pendant S1.          B : créée en S1, terminée en S2.
// C : créée en S1, jamais terminée.                  D : créée et terminée en S2.
// E : terminée bien avant S1 (n'est plus "en jeu").
const tasks = [
  { createdAt: at("2026-09-20T09:00:00Z"), completedAt: at("2026-09-30T12:00:00Z") },
  { createdAt: at("2026-09-29T09:00:00Z"), completedAt: at("2026-10-06T12:00:00Z") },
  { createdAt: at("2026-10-01T09:00:00Z"), completedAt: null },
  { createdAt: at("2026-10-07T09:00:00Z"), completedAt: at("2026-10-08T12:00:00Z") },
  { createdAt: at("2026-09-01T09:00:00Z"), completedAt: at("2026-09-10T12:00:00Z") },
];

test("completionByPeriod : terminées, charge, taux et évolution (exemple documenté)", () => {
  const items = completionByPeriod({ tasks, periods: weeks, timeZone: "UTC" });

  // S1 : terminées = A (1) ; charge = A, B, C (3) -> 1/3. D n'existe pas encore, E est déjà terminée.
  assert.deepEqual(items[0], {
    start: "2026-09-28",
    end: "2026-10-04",
    completed: 1,
    workload: 3,
    rate: 0.3333,
    change: null, // pas de période précédente
    habitCompletions: 0,
  });

  // S2 : terminées = B, D (2) ; charge = B, C, D (3) -> 2/3. A et E sont terminées avant S2.
  assert.equal(items[1].completed, 2);
  assert.equal(items[1].workload, 3);
  assert.equal(items[1].rate, 0.6667);
  assert.equal(items[1].change, 0.3334); // 0.6667 - 0.3333
});

test("completionByPeriod : le taux reste entre 0 et 1", () => {
  for (const item of completionByPeriod({ tasks, periods: weeks, timeZone: "UTC" })) {
    assert.ok(item.rate >= 0 && item.rate <= 1);
    assert.ok(item.completed <= item.workload);
  }
});

test("completionByPeriod : sans aucune tâche en jeu le taux est null (pas 0), et l'évolution aussi", () => {
  const items = completionByPeriod({ tasks: [], periods: weeks, timeZone: "UTC" });
  assert.deepEqual(items.map((i) => i.rate), [null, null]);
  assert.deepEqual(items.map((i) => i.change), [null, null]);
  assert.deepEqual(items.map((i) => i.workload), [0, 0]);
});

test("completionByPeriod : l'évolution est null si la période précédente n'a pas de taux", () => {
  // Une seule tâche, créée et terminée en S2 : S1 n'a aucune charge, S2 a un taux de 100 %.
  const onlyLate = [{ createdAt: at("2026-10-07T09:00:00Z"), completedAt: at("2026-10-08T12:00:00Z") }];
  const items = completionByPeriod({ tasks: onlyLate, periods: weeks, timeZone: "UTC" });
  assert.equal(items[0].rate, null);
  assert.equal(items[1].rate, 1);
  assert.equal(items[1].change, null);
});

test("completionByPeriod : le fuseau horaire peut faire passer une tâche d'une semaine à l'autre", () => {
  // Terminée le dimanche 4 octobre à 23h30 UTC.
  const lateSunday = [{ createdAt: at("2026-09-01T09:00:00Z"), completedAt: at("2026-10-04T23:30:00Z") }];

  // En UTC c'est encore la semaine 1...
  const utc = completionByPeriod({ tasks: lateSunday, periods: weeks, timeZone: "UTC" });
  assert.deepEqual(utc.map((i) => i.completed), [1, 0]);

  // ...mais à Paris (UTC+2) il est déjà lundi 5 octobre à 01h30 : semaine 2.
  const paris = completionByPeriod({ tasks: lateSunday, periods: weeks, timeZone: "Europe/Paris" });
  assert.deepEqual(paris.map((i) => i.completed), [0, 1]);
});

test("completionByPeriod compte aussi les habitudes réalisées pendant chaque période", () => {
  const items = completionByPeriod({
    tasks: [],
    habitDates: ["2026-09-29", "2026-10-05", "2026-10-06", "2026-10-20"],
    periods: weeks,
    timeZone: "UTC",
  });
  assert.deepEqual(items.map((i) => i.habitCompletions), [1, 2]); // le 20 octobre est hors période
});
