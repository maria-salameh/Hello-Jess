// Assemble les événements du calendrier. Comme statsCalculations.js, ce fichier ne contient que des
// fonctions "pures" (sans base de données), ce qui permet de les tester (voir backend/test/calendar.test.js).
//
// Le calendrier affiche trois sortes d'événements, chacune avec sa couleur dans l'application :
// - "task-due"  : une tâche pas encore terminée dont l'échéance tombe ce jour-là (violet, rouge si en retard)
// - "task-done" : une tâche terminée ce jour-là, vu depuis le fuseau horaire de l'utilisateur (vert)
// - "habit"     : une habitude réalisée ce jour-là (bleu)
// Une tâche terminée n'apparaît donc qu'à sa date de fin, pas à son échéance.
import { toCivilDate } from "../utils/dates.js";

// Ordre d'affichage des événements d'un même jour.
const TYPE_ORDER = { "task-due": 0, "task-done": 1, habit: 2 };

// Construit la liste des événements entre `from` et `to` (dates civiles, bornes comprises), triée par jour,
// puis par type, puis par titre.
// - dueTasks / completedTasks : des objets { id, title, status, priority, dueDate, completedAt }
// - habitEvents : des objets { date, habitId, habitName }
export function buildCalendarEvents({ from, to, timeZone, dueTasks, completedTasks, habitEvents }) {
  const events = [];

  for (const task of dueTasks) {
    // Les tâches terminées sont affichées à leur date de fin (plus bas), pas à leur échéance.
    if (task.status === "done" || !task.dueDate) continue;
    if (task.dueDate < from || task.dueDate > to) continue;
    events.push({
      date: task.dueDate,
      type: "task-due",
      title: task.title,
      taskId: task.id,
      status: task.status,
      priority: task.priority,
    });
  }

  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    // Le jour de fin dépend du fuseau horaire : 23h30 UTC peut déjà être le lendemain à Paris.
    const date = toCivilDate(task.completedAt, timeZone);
    if (date < from || date > to) continue;
    events.push({
      date,
      type: "task-done",
      title: task.title,
      taskId: task.id,
      status: task.status,
      priority: task.priority,
    });
  }

  for (const event of habitEvents) {
    if (event.date < from || event.date > to) continue;
    events.push({ date: event.date, type: "habit", title: event.habitName, habitId: event.habitId });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.title.localeCompare(b.title)
  );
}
