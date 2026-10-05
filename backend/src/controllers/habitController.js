// Gère le côté HTTP des endpoints d'habitudes (bonus B2) : lit la requête, appelle habitService, envoie la réponse.
import { validationError } from "../middleware.js";
import * as habitService from "../services/habitService.js";
import { isValidCivilDate } from "../utils/dates.js";

// Les ids MongoDB font 24 caractères hexadécimaux ; tout le reste ne peut pas être un vrai id d'habitude.
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);

// Réponse utilisée quand l'id dans l'URL n'est pas un id MongoDB valide.
function invalidId(res) {
  return validationError(res, [{ field: "id", message: "id must be a valid habit id" }]);
}

// Réponse utilisée quand l'habitude n'existe pas ou appartient à quelqu'un d'autre (dans les deux cas : 404).
function notFound(res) {
  return res.status(404).json({ detail: "Habit not found" });
}

// GET /api/habits - les habitudes de l'utilisateur. Avec ?from=...&to=..., chacune indique aussi
// les jours où elle a été réalisée pendant cette période (champ "completions").
export async function getAllHabits(req, res) {
  res.json(await habitService.listHabits(req.user._id, res.locals.query));
}

// POST /api/habits - crée une habitude.
export async function createHabit(req, res) {
  const habit = await habitService.createHabit(req.user._id, res.locals.body);
  res.status(201).json(habit);
}

// GET /api/habits/:id - le détail d'une habitude, avec son nombre total de jours réalisés.
export async function getHabit(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const habit = await habitService.getHabit(req.user._id, id);
  if (!habit) return notFound(res);
  res.json(habit);
}

// PATCH /api/habits/:id - modifie le nom ou la description d'une habitude.
export async function updateHabit(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const habit = await habitService.updateHabit(req.user._id, id, res.locals.body);
  if (!habit) return notFound(res);
  res.json(habit);
}

// DELETE /api/habits/:id - supprime une habitude et tous ses événements.
export async function deleteHabit(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const habit = await habitService.deleteHabit(req.user._id, id);
  if (!habit) return notFound(res);
  res.status(204).end();
}

// GET /api/habits/:id/events - les jours où l'habitude a été réalisée (période facultative ?from=&to=).
export async function getEvents(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const events = await habitService.listEvents(req.user._id, id, res.locals.query);
  if (!events) return notFound(res);
  res.json(events);
}

// POST /api/habits/:id/events - enregistre que l'habitude a été réalisée un jour donné ({ "date": "2026-10-05" }).
// Renvoie 201 si le jour vient d'être ajouté, 200 s'il était déjà enregistré.
export async function addEvent(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const { habit, event, created } = await habitService.addEvent(req.user._id, id, res.locals.body.date);
  if (!habit) return notFound(res);
  res.status(created ? 201 : 200).json(event);
}

// DELETE /api/habits/:id/events/:date - annule la réalisation d'un jour (la date est dans l'URL).
export async function removeEvent(req, res) {
  const { id, date } = req.params;
  if (!isObjectId(id)) return invalidId(res);
  if (!isValidCivilDate(date)) {
    return validationError(res, [{ field: "date", message: "date must be a real calendar date in YYYY-MM-DD format" }]);
  }

  const { habit, removed } = await habitService.removeEvent(req.user._id, id, date);
  if (!habit) return notFound(res);
  if (!removed) return res.status(404).json({ detail: "No completion recorded for that date" });
  res.status(204).end();
}
