// Logique métier des tâches et accès à la base de données. Les contrôleurs appellent ces fonctions et ne parlent
// jamais directement à MongoDB. Chaque fonction reçoit l'id de l'utilisateur pour qu'il ne touche qu'à ses propres tâches.
import { Task } from "../models/Task.js";
import { STATUSES } from "../schemas.js";

// Tâches ouvertes d'abord (les terminées en dernier), puis par échéance (sans échéance en dernier) ;
// à égalité, on garde l'ordre de création.
function byStatusThenDueDate(a, b) {
  const doneA = a.status === "done";
  const doneB = b.status === "done";
  if (doneA !== doneB) return doneA ? 1 : -1;
  if (Boolean(a.dueDate) !== Boolean(b.dueDate)) return a.dueDate ? -1 : 1;
  // Les dates "YYYY-MM-DD" se comparent correctement comme du simple texte.
  return a.dueDate ? a.dueDate.localeCompare(b.dueDate) : 0;
}

// Les tâches d'un utilisateur, avec des filtres facultatifs (bonus B1) :
// status, priority, dueFrom/dueTo (échéance comprise entre deux dates) et noDueDate (tâches sans échéance).
export async function listTasks(userId, { status, priority, dueFrom, dueTo, noDueDate } = {}) {
  const filter = { owner: userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (noDueDate) {
    // "null" correspond aussi aux tâches où le champ n'existe pas du tout.
    filter.dueDate = null;
  } else if (dueFrom || dueTo) {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = dueFrom;
    if (dueTo) filter.dueDate.$lte = dueTo;
  }

  // On récupère d'abord par ordre de création, pour que le tri ci-dessous garde cet ordre à égalité.
  const tasks = await Task.find(filter).sort({ _id: 1 });
  return tasks.sort(byStatusThenDueDate);
}

// Le compteur de tâches (bonus B1) : le total et le nombre de tâches pour chaque statut.
export async function countTasks(userId) {
  const counts = await Promise.all(STATUSES.map((status) => Task.countDocuments({ owner: userId, status })));
  const byStatus = Object.fromEntries(STATUSES.map((status, i) => [status, counts[i]]));
  return { total: counts.reduce((sum, n) => sum + n, 0), ...byStatus };
}

// Une seule tâche de l'utilisateur (null si elle n'existe pas ou appartient à quelqu'un d'autre).
export function getTask(userId, taskId) {
  return Task.findOne({ _id: taskId, owner: userId });
}

// Enregistre une nouvelle tâche appartenant à cet utilisateur.
export function createTask(userId, data) {
  // Une tâche créée directement "done" est terminée dès maintenant.
  const completedAt = data.status === "done" ? new Date() : null;
  return Task.create({ ...data, owner: userId, completedAt });
}

// Modifie des champs d'une tâche de l'utilisateur et renvoie la tâche mise à jour (null si introuvable).
export async function updateTask(userId, taskId, changes) {
  // Chercher aussi sur le propriétaire empêche de modifier la tâche de quelqu'un d'autre.
  const task = await Task.findOne({ _id: taskId, owner: userId });
  if (!task) return null;

  const wasDone = task.status === "done";
  task.set(changes);

  // Garde "completedAt" cohérent avec le statut : date de fin quand elle passe à "done",
  // effacée quand elle redevient "todo" ou "doing". Un statut qui reste "done" garde sa date d'origine.
  if (changes.status !== undefined) {
    if (task.status === "done" && !wasDone) task.completedAt = new Date();
    if (task.status !== "done") task.completedAt = null;
  }

  // save() revérifie toutes les règles du modèle (longueurs, valeurs autorisées...).
  return task.save();
}

// Supprime une tâche de l'utilisateur ; renvoie la tâche supprimée, ou null s'il n'y avait aucune correspondance.
export function deleteTask(userId, taskId) {
  return Task.findOneAndDelete({ _id: taskId, owner: userId });
}
