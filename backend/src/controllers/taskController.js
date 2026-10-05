// Gère le côté HTTP des endpoints de tâches : lit la requête, appelle taskService, envoie la réponse.
// Le vrai travail avec la base de données se trouve dans services/taskService.js.
import { validationError } from "../middleware.js";
import * as taskService from "../services/taskService.js";

// Les ids MongoDB font 24 caractères hexadécimaux ; tout le reste ne peut pas être un vrai id de tâche.
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);

// Réponse utilisée quand l'id dans l'URL n'est pas un id MongoDB valide.
function invalidId(res) {
  return validationError(res, [{ field: "id", message: "id must be a valid task id" }]);
}

// Réponse utilisée quand la tâche n'existe pas ou appartient à quelqu'un d'autre (dans les deux cas : 404).
function notFound(res) {
  return res.status(404).json({ detail: "Task not found" });
}

// GET /api/tasks - les tâches de l'utilisateur connecté, avec des filtres facultatifs dans l'URL :
// ?status=todo&priority=high&dueFrom=2026-10-01&dueTo=2026-10-31&noDueDate=true
export async function getAllTasks(req, res) {
  const { noDueDate, ...filters } = res.locals.query;
  const tasks = await taskService.listTasks(req.user._id, {
    ...filters,
    // Les paramètres d'URL contiennent du texte ("true"/"false") ; le service attend un vrai booléen.
    noDueDate: noDueDate === "true",
  });
  res.json(tasks);
}

// GET /api/tasks/count - le compteur de tâches : { total, todo, doing, done }.
export async function getTaskCount(req, res) {
  res.json(await taskService.countTasks(req.user._id));
}

// GET /api/tasks/:id - le détail d'une tâche.
export async function getTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.getTask(req.user._id, id);
  if (!task) return notFound(res);
  res.json(task);
}

// POST /api/tasks - crée une tâche pour l'utilisateur connecté.
export async function createTask(req, res) {
  const task = await taskService.createTask(req.user._id, res.locals.body);
  res.status(201).json(task);
}

// PATCH /api/tasks/:id - modifie certains champs d'une tâche de l'utilisateur.
export async function updateTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.updateTask(req.user._id, id, res.locals.body);
  if (!task) return notFound(res);
  res.json(task);
}

// DELETE /api/tasks/:id - supprime une tâche de l'utilisateur.
export async function deleteTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.deleteTask(req.user._id, id);
  if (!task) return notFound(res);
  // 204 = succès sans rien à renvoyer.
  res.status(204).end();
}
