// Calendrier : va chercher dans MongoDB les tâches et habitudes de l'utilisateur pour une période,
// puis confie l'assemblage des événements à calendarEvents.js.
import { Habit } from "../models/Habit.js";
import { HabitEvent } from "../models/HabitEvent.js";
import { Task } from "../models/Task.js";
import { addDays } from "../utils/dates.js";
import { buildCalendarEvents } from "./calendarEvents.js";

// Les événements de l'utilisateur entre deux dates civiles (tâches à faire, tâches terminées, habitudes réalisées).
export async function getCalendar(userId, { from, to, timeZone }) {
  // Marge d'un jour de chaque côté pour les tâches terminées : selon le fuseau horaire, un instant proche du bord
  // de la période peut tomber dans la période. Le tri exact par jour est refait ensuite, en tenant compte du fuseau.
  const lower = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
  const upper = new Date(`${addDays(to, 2)}T00:00:00.000Z`);

  const [dueTasks, completedTasks, habitDays] = await Promise.all([
    Task.find({ owner: userId, status: { $ne: "done" }, dueDate: { $gte: from, $lte: to } }),
    Task.find({ owner: userId, completedAt: { $gte: lower, $lt: upper } }),
    HabitEvent.find({ owner: userId, date: { $gte: from, $lte: to } }),
  ]);

  // Les événements d'habitude ne contiennent que l'id de l'habitude : on récupère les noms en une seule requête.
  const habitIds = [...new Set(habitDays.map((event) => event.habit.toString()))];
  const habits = await Habit.find({ _id: { $in: habitIds } }).select("name");
  const nameById = new Map(habits.map((habit) => [habit.id, habit.name]));

  const events = buildCalendarEvents({
    from,
    to,
    timeZone,
    dueTasks,
    completedTasks,
    habitEvents: habitDays.map((event) => ({
      date: event.date,
      habitId: event.habit.toString(),
      habitName: nameById.get(event.habit.toString()) ?? "Habit",
    })),
  });
  return { from, to, timeZone, events };
}
