// Logique métier des habitudes (bonus B2) et de leurs événements datés. Comme pour les tâches,
// chaque fonction reçoit l'id de l'utilisateur pour qu'il ne touche qu'à ses propres données.
import { Habit } from "../models/Habit.js";
import { HabitEvent } from "../models/HabitEvent.js";

// Les habitudes de l'utilisateur. Si une période from/to est donnée, chaque habitude reçoit aussi
// "completions" : la liste des jours (YYYY-MM-DD) où elle a été réalisée pendant cette période.
export async function listHabits(userId, { from, to } = {}) {
  const habits = await Habit.find({ owner: userId }).sort({ _id: 1 });
  if (!from && !to) return habits.map((habit) => habit.toJSON());

  // Une seule requête pour tous les événements de la période, rangés ensuite par habitude.
  const dateFilter = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  const events = await HabitEvent.find({ owner: userId, date: dateFilter }).sort({ date: 1 });

  const datesByHabit = new Map();
  for (const event of events) {
    const key = event.habit.toString();
    if (!datesByHabit.has(key)) datesByHabit.set(key, []);
    datesByHabit.get(key).push(event.date);
  }
  return habits.map((habit) => ({ ...habit.toJSON(), completions: datesByHabit.get(habit.id) ?? [] }));
}

// Une seule habitude de l'utilisateur, avec le nombre total de jours où elle a été réalisée.
export async function getHabit(userId, habitId) {
  const habit = await Habit.findOne({ _id: habitId, owner: userId });
  if (!habit) return null;
  const totalCompletions = await HabitEvent.countDocuments({ habit: habit._id });
  return { ...habit.toJSON(), totalCompletions };
}

// Enregistre une nouvelle habitude appartenant à cet utilisateur.
export function createHabit(userId, data) {
  return Habit.create({ ...data, owner: userId });
}

// Modifie une habitude de l'utilisateur et renvoie le résultat (null si introuvable).
export function updateHabit(userId, habitId, changes) {
  return Habit.findOneAndUpdate({ _id: habitId, owner: userId }, changes, {
    returnDocument: "after",
    runValidators: true,
  });
}

// Supprime une habitude ET tous ses événements (sans habitude, ils n'auraient plus de sens).
export async function deleteHabit(userId, habitId) {
  const habit = await Habit.findOneAndDelete({ _id: habitId, owner: userId });
  if (habit) await HabitEvent.deleteMany({ habit: habit._id });
  return habit;
}

// Enregistre que l'habitude a été réalisée ce jour-là. Renvoie { habit: null } si l'habitude est
// introuvable, sinon { event, created } : "created" vaut false si le jour était déjà enregistré.
export async function addEvent(userId, habitId, date) {
  const habit = await Habit.findOne({ _id: habitId, owner: userId });
  if (!habit) return { habit: null };

  try {
    const event = await HabitEvent.create({ owner: userId, habit: habit._id, date });
    return { habit, event, created: true };
  } catch (err) {
    // 11000 = clé en double : ce jour est déjà enregistré, on renvoie simplement l'événement existant.
    if (err.code !== 11000) throw err;
    const event = await HabitEvent.findOne({ habit: habit._id, date });
    return { habit, event, created: false };
  }
}

// Annule la réalisation d'un jour. Renvoie { habit: null } si l'habitude est introuvable,
// sinon { habit, removed } où "removed" indique si un événement existait pour ce jour.
export async function removeEvent(userId, habitId, date) {
  const habit = await Habit.findOne({ _id: habitId, owner: userId });
  if (!habit) return { habit: null };
  const removed = await HabitEvent.findOneAndDelete({ habit: habit._id, date });
  return { habit, removed: Boolean(removed) };
}

// Les événements d'une habitude (éventuellement limités à une période), du plus ancien au plus récent.
// Renvoie null si l'habitude est introuvable.
export async function listEvents(userId, habitId, { from, to } = {}) {
  const habit = await Habit.findOne({ _id: habitId, owner: userId });
  if (!habit) return null;

  const filter = { habit: habit._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return HabitEvent.find(filter).sort({ date: 1 });
}
