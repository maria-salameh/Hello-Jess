// Tests des règles de validation : tâches (titre, statut, description, échéance, priorité), habitudes
// et paramètres de statistiques. Lancer avec : npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completionQuerySchema,
  habitCreateSchema,
  habitEventCreateSchema,
  heatmapQuerySchema,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from "../src/schemas.js";

// Renvoie les messages d'erreur d'un schéma (liste vide si les données sont valides).
const errors = (schema, data) => {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

const validTask = { title: "Acheter du lait", status: "todo" };

// ----- Création d'une tâche -----

test("une tâche minimale (titre + statut) est valide, avec les valeurs par défaut attendues", () => {
  const result = taskCreateSchema.safeParse(validTask);
  assert.equal(result.success, true);
  assert.equal(result.data.priority, "medium");
  assert.equal(result.data.description, undefined);
  assert.equal(result.data.dueDate, undefined);
});

test("title : les espaces du début et de la fin sont retirés, puis 1 à 120 caractères", () => {
  assert.equal(taskCreateSchema.parse({ ...validTask, title: "  Acheter du lait  " }).title, "Acheter du lait");
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: "   " }), ["title must not be empty"]);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: "" }), ["title must not be empty"]);
  assert.deepEqual(errors(taskCreateSchema, { status: "todo" }), ["title is required and must be a string"]);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: 42 }), ["title is required and must be a string"]);

  // 120 caractères passent (même avec des espaces autour, car ils sont retirés avant le calcul), 121 non.
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: "a".repeat(120) }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: ` ${"a".repeat(120)} ` }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, title: "a".repeat(121) }), [
    "title must be at most 120 characters",
  ]);
});

test("status : obligatoire à la création, exactement todo, doing ou done", () => {
  for (const status of ["todo", "doing", "done"]) {
    assert.deepEqual(errors(taskCreateSchema, { ...validTask, status }), []);
  }
  assert.deepEqual(errors(taskCreateSchema, { title: "x" }), [
    "status is required and must be one of: todo, doing, done",
  ]);
  assert.equal(errors(taskCreateSchema, { ...validTask, status: "finished" }).length, 1);
  assert.equal(errors(taskCreateSchema, { ...validTask, status: "TODO" }).length, 1); // la casse compte
});

test("description : facultative, de 0 à 1000 caractères, la chaîne vide est acceptée", () => {
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, description: "" }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, description: "a".repeat(1000) }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, description: "a".repeat(1001) }), [
    "description must be at most 1000 characters",
  ]);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, description: null }), ["description must be a string"]);
});

test("dueDate : une vraie date YYYY-MM-DD, ou null, ou absente", () => {
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, dueDate: "2026-10-05" }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, dueDate: "2024-02-29" }), []);
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, dueDate: null }), []);
  assert.equal(errors(taskCreateSchema, { ...validTask, dueDate: "2026-02-30" }).length, 1); // jour inexistant
  assert.equal(errors(taskCreateSchema, { ...validTask, dueDate: "2026-13-01" }).length, 1); // mois inexistant
  assert.equal(errors(taskCreateSchema, { ...validTask, dueDate: "05/10/2026" }).length, 1); // mauvais format
  assert.equal(errors(taskCreateSchema, { ...validTask, dueDate: "2026-10-05T10:00:00Z" }).length, 1); // pas d'heure
  assert.equal(errors(taskCreateSchema, { ...validTask, dueDate: 20261005 }).length, 1);
});

test("priority (bonus B1) : low, medium ou high, medium par défaut", () => {
  for (const priority of ["low", "medium", "high"]) {
    assert.equal(taskCreateSchema.parse({ ...validTask, priority }).priority, priority);
  }
  assert.deepEqual(errors(taskCreateSchema, { ...validTask, priority: "urgent" }), [
    "priority must be one of: low, medium, high",
  ]);
});

test("plusieurs erreurs sont toutes remontées d'un coup", () => {
  assert.equal(errors(taskCreateSchema, { title: "", status: "nope", dueDate: "x", priority: "y" }).length, 4);
});

// ----- Modification d'une tâche -----

test("la modification accepte des champs partiels et applique les mêmes règles", () => {
  assert.deepEqual(errors(taskUpdateSchema, {}), []);
  assert.deepEqual(errors(taskUpdateSchema, { status: "doing" }), []);
  assert.deepEqual(errors(taskUpdateSchema, { description: "" }), []);
  assert.equal(taskUpdateSchema.parse({ dueDate: null }).dueDate, null); // null efface l'échéance
  assert.equal("dueDate" in taskUpdateSchema.parse({ status: "done" }), false); // champ absent = inchangé
  assert.deepEqual(errors(taskUpdateSchema, { title: "   " }), ["title must not be empty"]);
  assert.equal(errors(taskUpdateSchema, { status: "finished" }).length, 1);
});

test("la modification ignore les champs inconnus (impossible de changer le propriétaire)", () => {
  const data = taskUpdateSchema.parse({ title: "x", owner: "someone-else", completedAt: "2026-01-01" });
  assert.deepEqual(data, { title: "x" });
});

// ----- Filtres de la liste (bonus B1) -----

test("filtres de la liste : statut, priorité et échéance", () => {
  assert.deepEqual(errors(taskListQuerySchema, {}), []);
  assert.deepEqual(errors(taskListQuerySchema, { status: "doing", priority: "high" }), []);
  assert.deepEqual(errors(taskListQuerySchema, { dueFrom: "2026-10-01", dueTo: "2026-10-31" }), []);
  assert.deepEqual(errors(taskListQuerySchema, { noDueDate: "true" }), []);
  assert.equal(errors(taskListQuerySchema, { status: "nope" }).length, 1);
  assert.equal(errors(taskListQuerySchema, { dueFrom: "2026-10-31", dueTo: "2026-10-01" }).length, 1);
  assert.equal(errors(taskListQuerySchema, { noDueDate: "true", dueFrom: "2026-10-01" }).length, 1);
  assert.equal(errors(taskListQuerySchema, { noDueDate: "maybe" }).length, 1);
});

// ----- Habitudes (bonus B2) -----

test("habitude : le nom est obligatoire (1 à 100 caractères), la description facultative (500 max)", () => {
  assert.equal(habitCreateSchema.parse({ name: "  Boire de l'eau " }).name, "Boire de l'eau");
  assert.deepEqual(errors(habitCreateSchema, { name: "  " }), ["name must not be empty"]);
  assert.deepEqual(errors(habitCreateSchema, {}), ["name is required and must be a string"]);
  assert.equal(errors(habitCreateSchema, { name: "a".repeat(101) }).length, 1);
  assert.deepEqual(errors(habitCreateSchema, { name: "x", description: "a".repeat(500) }), []);
  assert.equal(errors(habitCreateSchema, { name: "x", description: "a".repeat(501) }).length, 1);
});

test("événement d'habitude : une vraie date, pas dans le futur", () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual(errors(habitEventCreateSchema, { date: today }), []);
  assert.deepEqual(errors(habitEventCreateSchema, { date: "2020-01-31" }), []);
  assert.equal(errors(habitEventCreateSchema, { date: "2999-01-01" }).length, 1);
  assert.equal(errors(habitEventCreateSchema, { date: "2026-02-30" }).length, 1);
  assert.equal(errors(habitEventCreateSchema, {}).length, 1);
});

// ----- Statistiques (bonus B3 et B4) -----

test("paramètres de la heatmap : dates et fuseau horaire facultatifs mais valides", () => {
  assert.deepEqual(errors(heatmapQuerySchema, {}), []);
  assert.deepEqual(errors(heatmapQuerySchema, { from: "2026-01-01", to: "2026-10-05", tz: "Europe/Paris" }), []);
  assert.equal(errors(heatmapQuerySchema, { tz: "Mars/Phobos" }).length, 1);
  assert.equal(errors(heatmapQuerySchema, { from: "2026-10-05", to: "2026-01-01" }).length, 1);
});

test("paramètres du taux de complétion : période, nombre de périodes (1 à 52) et fuseau", () => {
  assert.deepEqual(errors(completionQuerySchema, {}), []);
  assert.equal(completionQuerySchema.parse({ count: "8" }).count, 8); // le texte de l'URL devient un nombre
  assert.deepEqual(errors(completionQuerySchema, { period: "month", count: "12", tz: "UTC" }), []);
  assert.equal(errors(completionQuerySchema, { period: "year" }).length, 1);
  assert.equal(errors(completionQuerySchema, { count: "0" }).length, 1);
  assert.equal(errors(completionQuerySchema, { count: "53" }).length, 1);
  assert.equal(errors(completionQuerySchema, { count: "2.5" }).length, 1);
  assert.equal(errors(completionQuerySchema, { count: "abc" }).length, 1);
});
