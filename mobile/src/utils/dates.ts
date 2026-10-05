// Petits outils de dates pour l'interface. Une "date civile" est un jour du calendrier au format
// "YYYY-MM-DD" (sans heure), comme celles échangées avec le backend.
// Les noms de jours et de mois sont écrits à la main (sans Intl) pour fonctionner partout sur téléphone.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Remet une date au format "YYYY-MM-DD" à partir de ses composantes UTC.
function formatUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Transforme une date civile en objet Date à minuit UTC (pour lire son jour de la semaine, son mois...).
function toUtcDate(civil: string): Date {
  return new Date(`${civil}T00:00:00Z`);
}

// Aujourd'hui, dans le calendrier du téléphone (le jour que l'utilisateur voit sur son horloge).
export function todayLocal(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Ajoute (ou retire, si négatif) des jours à une date civile.
export function addDays(civil: string, days: number): string {
  const date = toUtcDate(civil);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtc(date);
}

// Lundi de la semaine qui contient cette date (les semaines vont du lundi au dimanche).
export function startOfWeek(civil: string): string {
  const weekday = (toUtcDate(civil).getUTCDay() + 6) % 7; // 0 = lundi
  return addDays(civil, -weekday);
}

// Dimanche de la semaine qui contient cette date.
export function endOfWeek(civil: string): string {
  return addDays(startOfWeek(civil), 6);
}

// Premier jour du mois qui contient cette date.
export function startOfMonth(civil: string): string {
  return `${civil.slice(0, 8)}01`;
}

// Dernier jour du mois qui contient cette date (gère les années bissextiles).
export function endOfMonth(civil: string): string {
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  return formatUtc(new Date(Date.UTC(year, month, 0)));
}

// Le premier jour du mois situé `months` mois avant ou après (négatif = avant).
export function addMonths(civil: string, months: number): string {
  const year = Number(civil.slice(0, 4));
  const month = Number(civil.slice(5, 7));
  return formatUtc(new Date(Date.UTC(year, month - 1 + months, 1)));
}

// Le nom du mois et l'année, par exemple "October 2026".
export function monthYear(civil: string): string {
  return `${FULL_MONTHS[Number(civil.slice(5, 7)) - 1]} ${civil.slice(0, 4)}`;
}

// Le fuseau horaire du téléphone (ex. "Europe/Paris"), envoyé au backend pour les statistiques.
// Si le téléphone ne sait pas le dire, on retombe sur "UTC".
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Le numéro du jour dans le mois d'une date civile (1 à 31).
export function dayOfMonth(civil: string): number {
  return Number(civil.slice(8, 10));
}

// Le jour de la semaine abrégé d'une date civile, par exemple "Mon".
export function weekdayShort(civil: string): string {
  return WEEKDAYS[toUtcDate(civil).getUTCDay()];
}

// Le nom abrégé du mois d'une date civile, par exemple "Oct".
export function monthShort(civil: string): string {
  return MONTHS[Number(civil.slice(5, 7)) - 1];
}

// Affiche une date civile de façon lisible, par exemple "Oct 5, 2026".
export function formatDate(civil: string): string {
  return `${monthShort(civil)} ${dayOfMonth(civil)}, ${civil.slice(0, 4)}`;
}

// Affiche un instant (date et heure) dans le fuseau du téléphone.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${formatDate(todayLocal(date))} ${time}`;
}
