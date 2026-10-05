// Tests des outils de dates : dates civiles, semaines/mois et fuseaux horaires (dont l'heure d'été).
// Lancer avec : npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  daysBetween,
  eachDay,
  endOfMonth,
  endOfWeek,
  isValidCivilDate,
  isValidTimeZone,
  startOfMonth,
  startOfWeek,
  toCivilDate,
} from "../src/utils/dates.js";

test("isValidCivilDate accepte les vraies dates et refuse le reste", () => {
  assert.equal(isValidCivilDate("2026-10-05"), true);
  assert.equal(isValidCivilDate("2024-02-29"), true); // 2024 est bissextile
  assert.equal(isValidCivilDate("2026-02-29"), false); // 2026 ne l'est pas
  assert.equal(isValidCivilDate("2026-02-30"), false);
  assert.equal(isValidCivilDate("2026-13-01"), false);
  assert.equal(isValidCivilDate("2026-10-5"), false); // il faut 2 chiffres
  assert.equal(isValidCivilDate("05/10/2026"), false);
  assert.equal(isValidCivilDate(20261005), false);
  assert.equal(isValidCivilDate(null), false);
});

test("addDays passe correctement les fins de mois, d'année et les années bissextiles", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
  assert.equal(addDays("2026-10-05", 0), "2026-10-05");
});

test("daysBetween compte les jours entre deux dates", () => {
  assert.equal(daysBetween("2026-10-05", "2026-10-05"), 0);
  assert.equal(daysBetween("2026-10-05", "2026-10-12"), 7);
  assert.equal(daysBetween("2026-10-12", "2026-10-05"), -7);
});

test("eachDay liste tous les jours, bornes comprises, sans trou ni doublon à l'heure d'été", () => {
  // Le 29 mars 2026, la France passe à l'heure d'été (journée de 23 h) : le jour doit apparaître une fois.
  assert.deepEqual(eachDay("2026-03-28", "2026-03-30"), ["2026-03-28", "2026-03-29", "2026-03-30"]);
  assert.deepEqual(eachDay("2026-10-05", "2026-10-05"), ["2026-10-05"]);
  assert.deepEqual(eachDay("2026-10-06", "2026-10-05"), []);
  assert.equal(eachDay("2026-01-01", "2026-12-31").length, 365);
});

test("startOfWeek et endOfWeek : les semaines vont du lundi au dimanche", () => {
  // Le 5 octobre 2026 est un lundi.
  assert.equal(startOfWeek("2026-10-05"), "2026-10-05");
  assert.equal(startOfWeek("2026-10-07"), "2026-10-05");
  assert.equal(startOfWeek("2026-10-11"), "2026-10-05"); // dimanche
  assert.equal(startOfWeek("2026-10-04"), "2026-09-28"); // le dimanche d'avant appartient à la semaine précédente
  assert.equal(endOfWeek("2026-10-05"), "2026-10-11");
  // Une semaine à cheval sur deux années.
  assert.equal(startOfWeek("2026-01-01"), "2025-12-29");
  assert.equal(endOfWeek("2026-01-01"), "2026-01-04");
});

test("startOfMonth et endOfMonth gèrent la longueur des mois et février bissextile", () => {
  assert.equal(startOfMonth("2026-10-17"), "2026-10-01");
  assert.equal(endOfMonth("2026-10-17"), "2026-10-31");
  assert.equal(endOfMonth("2026-02-10"), "2026-02-28");
  assert.equal(endOfMonth("2024-02-10"), "2024-02-29");
  assert.equal(endOfMonth("2026-12-05"), "2026-12-31");
});

test("isValidTimeZone reconnaît les fuseaux IANA", () => {
  assert.equal(isValidTimeZone("Europe/Paris"), true);
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("Mars/Phobos"), false);
  assert.equal(isValidTimeZone(""), false);
});

test("toCivilDate : un même instant tombe sur des jours différents selon le fuseau", () => {
  const instant = new Date("2026-03-01T23:30:00Z");
  assert.equal(toCivilDate(instant, "UTC"), "2026-03-01");
  assert.equal(toCivilDate(instant, "America/New_York"), "2026-03-01"); // 18h30
  assert.equal(toCivilDate(instant, "Europe/Paris"), "2026-03-02"); // 00h30
  assert.equal(toCivilDate(instant, "Asia/Tokyo"), "2026-03-02"); // 08h30
  assert.equal(toCivilDate(instant, "Pacific/Kiritimati"), "2026-03-02"); // UTC+14
});

test("toCivilDate tient compte du passage à l'heure d'été (printemps)", () => {
  // Le 29 mars 2026 à 01h00 UTC, Paris passe de UTC+1 à UTC+2.
  assert.equal(toCivilDate(new Date("2026-03-29T00:30:00Z"), "Europe/Paris"), "2026-03-29"); // 01h30
  assert.equal(toCivilDate(new Date("2026-03-29T21:30:00Z"), "Europe/Paris"), "2026-03-29"); // 23h30
  assert.equal(toCivilDate(new Date("2026-03-29T22:30:00Z"), "Europe/Paris"), "2026-03-30"); // 00h30 (UTC+2)
});

test("toCivilDate tient compte du retour à l'heure d'hiver (automne)", () => {
  // Le 25 octobre 2026 à 01h00 UTC, Paris repasse de UTC+2 à UTC+1 : ce jour dure 25 heures.
  assert.equal(toCivilDate(new Date("2026-10-24T22:30:00Z"), "Europe/Paris"), "2026-10-25"); // 00h30 (UTC+2)
  assert.equal(toCivilDate(new Date("2026-10-25T22:30:00Z"), "Europe/Paris"), "2026-10-25"); // 23h30 (UTC+1)
  assert.equal(toCivilDate(new Date("2026-10-25T23:30:00Z"), "Europe/Paris"), "2026-10-26"); // 00h30
});
