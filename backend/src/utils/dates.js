// Outils pour manipuler des "dates civiles" (YYYY-MM-DD, sans heure) et les fuseaux horaires.
// Une date civile est un jour du calendrier comme "2026-10-05" ; elle ne dépend d'aucun fuseau.
// Les calculs passent par des dates UTC à minuit, ce qui évite tout problème d'heure d'été.

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Découpe "2026-10-05" en trois nombres [année, mois, jour].
function parts(civil) {
  return civil.split("-").map(Number);
}

// Remet une date UTC au format "YYYY-MM-DD".
function format(date) {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Vrai si le texte est une vraie date du calendrier : "2026-02-30" ou "2026-13-01" sont refusées.
export function isValidCivilDate(value) {
  if (typeof value !== "string" || !CIVIL_DATE.test(value)) return false;
  const [year, month, day] = parts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Ajoute (ou retire, si négatif) un nombre de jours à une date civile.
export function addDays(civil, days) {
  const [year, month, day] = parts(civil);
  return format(new Date(Date.UTC(year, month - 1, day + days)));
}

// Nombre de jours entre deux dates civiles (to - from).
export function daysBetween(from, to) {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

// Liste tous les jours de from à to, bornes comprises (liste vide si from > to).
export function eachDay(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// Lundi de la semaine qui contient cette date (les semaines vont du lundi au dimanche).
export function startOfWeek(civil) {
  const [year, month, day] = parts(civil);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = dimanche
  return addDays(civil, -((weekday + 6) % 7));
}

// Dimanche de la semaine qui contient cette date.
export function endOfWeek(civil) {
  return addDays(startOfWeek(civil), 6);
}

// Premier jour du mois qui contient cette date.
export function startOfMonth(civil) {
  const [year, month] = parts(civil);
  return format(new Date(Date.UTC(year, month - 1, 1)));
}

// Dernier jour du mois qui contient cette date (gère les années bissextiles).
export function endOfMonth(civil) {
  const [year, month] = parts(civil);
  return format(new Date(Date.UTC(year, month, 0)));
}

// Vrai si c'est un fuseau horaire IANA connu, par exemple "Europe/Paris" ou "UTC".
export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Un formateur par fuseau, gardé en mémoire car sa création coûte cher.
const formatters = new Map();

// Le jour du calendrier (YYYY-MM-DD) d'un instant donné, vu depuis un fuseau horaire.
// Exemple : 2026-03-01T23:30:00Z est le 1er mars à New York mais déjà le 2 mars à Paris.
export function toCivilDate(instant, timeZone = "UTC") {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const found = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return `${found.year}-${found.month}-${found.day}`;
}

// La date d'aujourd'hui dans un fuseau donné (le paramètre "now" sert aux tests).
export function todayIn(timeZone, now = new Date()) {
  return toCivilDate(now, timeZone);
}
