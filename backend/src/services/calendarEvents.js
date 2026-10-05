// Assemble les événements du calendrier. Comme statsCalculations.js, ce fichier ne contient que des
// fonctions "pures" (sans base de données), ce qui permet de les tester (voir backend/test/calendar.test.js).
//
// Le calendrier affiche cinq sortes d'événements :
// - "task-due"      : une tâche pas encore terminée (à faire ou en cours) à sa date d'échéance
// - "task-overdue"  : une tâche en retard dont l'échéance est AVANT la période affichée. Comme sa date n'est
//                     pas visible, elle est reportée sur aujourd'hui (si aujourd'hui fait partie de la période)
//                     et garde sa vraie échéance dans "dueDate"
// - "task-undated"  : une tâche pas encore terminée SANS échéance, affichée le jour où elle a été ajoutée
//                     (vu depuis le fuseau horaire de l'utilisateur), pour qu'elle apparaisse quand même
// - "task-done"     : une tâche terminée, à son jour de fin
// - "habit"         : une habitude réalisée ce jour-là
// Chaque événement de tâche contient son "status" (todo, doing ou done) : c'est lui qui décide de la couleur
// dans les applications. Une tâche terminée n'apparaît qu'à sa date de fin, pas à son échéance.
import { toCivilDate } from "../utils/dates.js";

// Ordre d'affichage des événements d'un même jour.
const TYPE_ORDER = { "task-overdue": 0, "task-due": 1, "task-undated": 2, "task-done": 3, habit: 4 };

// Construit la liste des événements entre `from` et `to` (dates civiles, bornes comprises), triée par jour,
// puis par type, puis par titre. `today` est la date d'aujourd'hui dans le fuseau de l'utilisateur.
// - dueTasks / overdueTasks / undatedTasks / completedTasks : des objets { id, title, status, priority, dueDate, createdAt, completedAt }
// - habitEvents : des objets { date, habitId, habitName }
export function buildCalendarEvents({
  from,
  to,
  today,
  timeZone,
  dueTasks,
  overdueTasks = [],
  undatedTasks = [],
  completedTasks,
  habitEvents,
}) {
  const events = [];
  const taskEvent = (type, date, task) => ({
    date,
    type,
    title: task.title,
    taskId: task.id,
    status: task.status,
    priority: task.priority,
  });

  for (const task of dueTasks) {
    // Les tâches terminées sont affichées à leur date de fin (plus bas), pas à leur échéance.
    if (task.status === "done" || !task.dueDate) continue;
    if (task.dueDate < from || task.dueDate > to) continue;
    events.push(taskEvent("task-due", task.dueDate, task));
  }

  // Les tâches en retard dont l'échéance est avant la période sont reportées sur aujourd'hui,
  // mais seulement si aujourd'hui est dans la période affichée (sinon il n'y a nulle part où les montrer).
  if (today >= from && today <= to) {
    for (const task of overdueTasks) {
      if (task.status === "done" || !task.dueDate || task.dueDate >= from) continue;
      events.push({ ...taskEvent("task-overdue", today, task), dueDate: task.dueDate });
    }
  }

  for (const task of undatedTasks) {
    // Seules les tâches ouvertes et sans échéance sont placées à leur jour de création.
    if (task.status === "done" || task.dueDate) continue;
    // Le jour de création dépend du fuseau horaire : 23h30 UTC peut déjà être le lendemain à Paris.
    const date = toCivilDate(task.createdAt, timeZone);
    if (date < from || date > to) continue;
    events.push(taskEvent("task-undated", date, task));
  }

  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    // Le jour de fin dépend du fuseau horaire, comme pour la création.
    const date = toCivilDate(task.completedAt, timeZone);
    if (date < from || date > to) continue;
    events.push(taskEvent("task-done", date, task));
  }

  for (const event of habitEvents) {
    if (event.date < from || event.date > to) continue;
    events.push({ date: event.date, type: "habit", title: event.habitName, habitId: event.habitId });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.title.localeCompare(b.title)
  );
}
