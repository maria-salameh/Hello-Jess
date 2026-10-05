// Calculs des statistiques (bonus B3 et B4). Ce fichier ne contient que des fonctions "pures" :
// elles reçoivent des données simples et renvoient un résultat, sans toucher à la base de données.
// C'est ce qui permet de les tester facilement (voir backend/test/stats.test.js).
//
// Définitions utilisées (les mêmes que dans le README) :
//
// - Jour d'une tâche terminée : on prend l'instant "completedAt" et on le convertit en jour du calendrier
//   dans le fuseau horaire de l'utilisateur. Une tâche terminée à 23h30 UTC le 1er mars compte donc pour
//   le 2 mars à Paris, mais pour le 1er mars à New York.
// - Jour d'une habitude réalisée : c'est directement la date civile enregistrée (déjà dans le calendrier de l'utilisateur).
// - Période : une semaine (du lundi au dimanche) ou un mois civil, toujours calculés sur des dates civiles.
// - Charge d'une période : nombre de tâches "en jeu" pendant la période, c'est-à-dire créées au plus tard le
//   dernier jour de la période ET pas encore terminées avant son premier jour.
// - Terminées d'une période : nombre de tâches dont le jour de fin tombe dans la période.
// - Taux de complétion = terminées / charge (entre 0 et 1). Sans aucune tâche en jeu, le taux est null
//   (et non 0) : on ne peut pas mesurer un taux sur zéro tâche.
// - Évolution = taux de la période moins celui de la période précédente (null si l'un des deux est null).
//
// Limite connue : si une tâche terminée est rouverte, sa date de fin est effacée, donc elle ne compte plus
// comme terminée dans le passé (l'historique des réouvertures n'est pas conservé).
import { addDays, eachDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek, toCivilDate } from "../utils/dates.js";

// Arrondit à 4 décimales pour éviter les résultats comme 0.30000000000000004.
const round = (value) => Math.round(value * 10000) / 10000;

// Ajoute 1 au compteur d'une clé dans une Map.
function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

// Niveau d'intensité d'une case de la heatmap, de 0 (aucune activité) à 4 (le jour le plus actif).
// Les niveaux 1 à 4 sont proportionnels au maximum de la période affichée.
export function levelFor(total, max) {
  if (total <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((total / max) * 4));
}

// Heatmap : une entrée par jour entre `from` et `to` (bornes comprises), y compris les jours à zéro.
// - taskCompletedAts : les instants (Date) où des tâches ont été terminées
// - habitDates : les dates civiles (YYYY-MM-DD) où des habitudes ont été réalisées
export function buildHeatmap({ from, to, taskCompletedAts, habitDates, timeZone }) {
  const tasksPerDay = new Map();
  const habitsPerDay = new Map();
  for (const completedAt of taskCompletedAts) increment(tasksPerDay, toCivilDate(completedAt, timeZone));
  for (const date of habitDates) increment(habitsPerDay, date);

  const days = eachDay(from, to).map((date) => {
    const tasks = tasksPerDay.get(date) ?? 0;
    const habits = habitsPerDay.get(date) ?? 0;
    return { date, tasks, habits, total: tasks + habits };
  });

  const max = days.reduce((highest, day) => Math.max(highest, day.total), 0);
  return { days: days.map((day) => ({ ...day, level: levelFor(day.total, max) })), max };
}

// Les `count` dernières périodes (semaines ou mois), de la plus ancienne à celle qui contient `today`.
// Chaque période est { start, end } en dates civiles.
export function buildPeriods(today, period, count) {
  const isMonth = period === "month";
  const periods = [];
  let start = isMonth ? startOfMonth(today) : startOfWeek(today);
  for (let i = 0; i < count; i++) {
    periods.unshift({ start, end: isMonth ? endOfMonth(start) : endOfWeek(start) });
    // La période précédente commence 7 jours plus tôt (semaine) ou au début du mois d'avant (mois).
    start = isMonth ? startOfMonth(addDays(start, -1)) : addDays(start, -7);
  }
  return periods;
}

// Statistiques de complétion pour chaque période (voir les définitions en haut du fichier).
// - tasks : des objets { createdAt, completedAt } (Date, completedAt peut être null)
// - habitDates : les dates civiles où des habitudes ont été réalisées
export function completionByPeriod({ tasks, habitDates = [], periods, timeZone }) {
  // On convertit chaque instant en jour civil une seule fois, pour ne pas le refaire à chaque période.
  const dated = tasks.map((task) => ({
    created: toCivilDate(task.createdAt, timeZone),
    completed: task.completedAt ? toCivilDate(task.completedAt, timeZone) : null,
  }));

  let previousRate = null;
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
