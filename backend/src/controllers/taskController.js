// Gère le côté HTTP des endpoints de tâches : lit la requête, appelle taskService, envoie la réponse.
// Le vrai travail avec la base de données se trouve dans services/taskService.js.
import * as taskService from "../services/taskService.js";

// Les ids MongoDB font 24 caractères hexadécimaux ; tout le reste ne peut pas être un vrai id de tâche.
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);

// Réponse utilisée quand l'id dans l'URL n'est pas un id MongoDB valide.
function invalidId(res) {
  return res.status(422).json({ detail: "Invalid task id" });
}

// GET /api/tasks - toutes les tâches de l'utilisateur connecté, filtrables avec ?completed=true/false.
export async function getAllTasks(req, res) {
  const { completed } = res.locals.query;
  const tasks = await taskService.listTasks(req.user._id, {
    // Les paramètres d'URL contiennent du texte ("true"/"false") ; le service attend un vrai booléen.
    completed: completed === undefined ? undefined : completed === "true",
  });
  res.json(tasks);
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
  // Aucun résultat : la tâche n'existe pas ou appartient à quelqu'un d'autre ; dans les deux cas le client reçoit un 404.
  if (!task) return res.status(404).json({ detail: "Task not found" });
  res.json(task);
}

// DELETE /api/tasks/:id - supprime une tâche de l'utilisateur.
export async function deleteTask(req, res) {
  const { id } = req.params;
  if (!isObjectId(id)) return invalidId(res);

  const task = await taskService.deleteTask(req.user._id, id);
  if (!task) return res.status(404).json({ detail: "Task not found" });
  // 204 = succès sans rien à renvoyer.
  res.status(204).end();
}
