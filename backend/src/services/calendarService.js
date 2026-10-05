// Calendrier : va chercher dans MongoDB les tâches et habitudes de l'utilisateur pour une période,
// puis confie l'assemblage des événements à calendarEvents.js. Une tâche pas encore terminée apparaît
// toujours : à son échéance si elle en a une, sinon au jour où elle a été ajoutée.
import { Habit } from "../models/Habit.js";
import { HabitEvent } from "../models/HabitEvent.js";
import { Task } from "../models/Task.js";
import { addDays } from "../utils/dates.js";
import { buildCalendarEvents } from "./calendarEvents.js";

// Les événements de l'utilisateur entre deux dates civiles (tâches à faire, tâches terminées, habitudes réalisées).
export async function getCalendar(userId, { from, to, timeZone, today }) {
  // Marge d'un jour de chaque côté pour les tâches terminées : selon le fuseau horaire, un instant proche du bord
  // de la période peut tomber dans la période. Le tri exact par jour est refait ensuite, en tenant compte du fuseau.
  const lower = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
  const upper = new Date(`${addDays(to, 2)}T00:00:00.000Z`);

  // Les tâches en retard dont l'échéance précède la période ne sont cherchées que si aujourd'hui est dans la période
  // (c'est là qu'elles sont reportées, voir calendarEvents.js).
  const showOverdue = today >= from && today <= to;

  const [dueTasks, overdueTasks, undatedTasks, completedTasks, habitDays] = await Promise.all([
    // Les tâches ouvertes dont l'échéance tombe dans la période...
    Task.find({ owner: userId, status: { $ne: "done" }, dueDate: { $gte: from, $lte: to } }),
    // ...celles qui étaient dues avant la période et ne sont toujours pas terminées (en retard)...
    showOverdue ? Task.find({ owner: userId, status: { $ne: "done" }, dueDate: { $lt: from } }) : [],
    // ...et les tâches ouvertes sans échéance, créées dans la période (affichées à leur jour de création).
    Task.find({ owner: userId, status: { $ne: "done" }, dueDate: null, createdAt: { $gte: lower, $lt: upper } }),
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
    today,
    timeZone,
    dueTasks,
    overdueTasks,
    undatedTasks,
    completedTasks,
    habitEvents: habitDays.map((event) => ({
      date: event.date,
      habitId: event.habit.toString(),
      habitName: nameById.get(event.habit.toString()) ?? "Habit",
    })),
  });
  return { from, to, timeZone, events };
}
