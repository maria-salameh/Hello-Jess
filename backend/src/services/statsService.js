// Statistiques (bonus B3 et B4) : va chercher les données de l'utilisateur dans MongoDB, puis confie
// les calculs aux fonctions pures de statsCalculations.js.
import { HabitEvent } from "../models/HabitEvent.js";
import { Task } from "../models/Task.js";
import { addDays } from "../utils/dates.js";
import { buildHeatmap, buildPeriods, completionByPeriod } from "./statsCalculations.js";

// La heatmap de l'utilisateur entre deux dates civiles : tâches terminées et habitudes réalisées, jour par jour.
export async function getHeatmap(userId, { from, to, timeZone }) {
  // Marge d'un jour de chaque côté : selon le fuseau horaire, un instant proche du bord de la période
  // peut tomber dans la période. Le tri exact par jour est refait ensuite, en tenant compte du fuseau.
  const lower = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
  const upper = new Date(`${addDays(to, 2)}T00:00:00.000Z`);

  const [tasks, events] = await Promise.all([
    Task.find({ owner: userId, completedAt: { $gte: lower, $lt: upper } }).select("completedAt"),
    HabitEvent.find({ owner: userId, date: { $gte: from, $lte: to } }).select("date"),
  ]);

  const { days, max } = buildHeatmap({
    from,
    to,
    taskCompletedAts: tasks.map((task) => task.completedAt),
    habitDates: events.map((event) => event.date),
    timeZone,
  });
  return { from, to, timeZone, max, days };
}

// Le taux de complétion de l'utilisateur sur les `count` dernières semaines ou derniers mois.
export async function getCompletion(userId, { period, count, timeZone, today }) {
  const periods = buildPeriods(today, period, count);
  const first = periods[0].start;
  const last = periods[periods.length - 1].end;

  const [tasks, events] = await Promise.all([
    Task.find({ owner: userId }).select("createdAt completedAt"),
    HabitEvent.find({ owner: userId, date: { $gte: first, $lte: last } }).select("date"),
  ]);

  const items = completionByPeriod({
    tasks,
    habitDates: events.map((event) => event.date),
    periods,
    timeZone,
  });
  return { period, timeZone, today, items };
}
