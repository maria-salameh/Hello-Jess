// Logique métier des tâches et accès à la base de données. Les contrôleurs appellent ces fonctions et ne parlent
// jamais directement à MongoDB. Chaque fonction reçoit l'id de l'utilisateur pour qu'il ne touche qu'à ses propres tâches.
import { Task } from "../models/Task.js";

// Tâches ouvertes d'abord, puis par date limite (sans date en dernier) ; à égalité, on garde l'ordre de création.
function byCompletedThenDueDate(a, b) {
  if (a.completed !== b.completed) return a.completed - b.completed;
  if (Boolean(a.due_date) !== Boolean(b.due_date)) return a.due_date ? -1 : 1;
  return a.due_date ? a.due_date - b.due_date : 0;
}

// Toutes les tâches d'un utilisateur, éventuellement seulement les terminées ou seulement les ouvertes, dans l'ordre ci-dessus.
export async function listTasks(userId, { completed } = {}) {
  const filter = { owner: userId };
  if (completed !== undefined) filter.completed = completed;

  // On récupère d'abord par ordre de création, pour que le tri ci-dessous garde cet ordre à égalité.
  const tasks = await Task.find(filter).sort({ _id: 1 });
  return tasks.sort(byCompletedThenDueDate);
}

// Enregistre une nouvelle tâche appartenant à cet utilisateur.
export function createTask(userId, data) {
  return Task.create({ ...data, owner: userId });
}

// Modifie des champs d'une tâche de l'utilisateur et renvoie la tâche mise à jour (null si introuvable).
export function updateTask(userId, taskId, changes) {
  // Filtrer aussi sur le propriétaire empêche de modifier la tâche de quelqu'un d'autre.
  const filter = { _id: taskId, owner: userId };
  // Rien à modifier : on renvoie simplement la tâche telle quelle.
  if (Object.keys(changes).length === 0) return Task.findOne(filter);
  // "after" renvoie la tâche telle qu'elle est après la modification ; runValidators revérifie les nouvelles valeurs.
  return Task.findOneAndUpdate(filter, changes, { returnDocument: "after", runValidators: true });
}

// Supprime une tâche de l'utilisateur ; renvoie la tâche supprimée, ou null s'il n'y avait aucune correspondance.
export function deleteTask(userId, taskId) {
  return Task.findOneAndDelete({ _id: taskId, owner: userId });
}
