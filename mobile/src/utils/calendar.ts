// Les couleurs et les textes des événements du calendrier (les mêmes que sur le site web).
import type { CalendarEvent } from "../api";
import { formatDate } from "./dates";

// La couleur d'une tâche dépend de son statut : violet (à faire), orange (en cours), vert (terminée).
// Bleu : habitude réalisée. Rouge : contour d'une tâche en retard.
export const EVENT_COLORS = {
  todo: "#6c5ce7",
  doing: "#e08a1e",
  done: "#4caf82",
  habit: "#2ba3d6",
  overdue: "#e2574c",
};

// Les noms des statuts, tels qu'affichés dans la liste du jour.
const STATUS_LABEL = { todo: "To do", doing: "Doing", done: "Done" };

// Une tâche est en retard si elle est à faire ou en cours et que son échéance est passée : soit elle est affichée
// à son échéance (qui est avant aujourd'hui), soit elle a été reportée sur aujourd'hui ("task-overdue").
export function isOverdue(event: CalendarEvent, today: string): boolean {
  if (event.type === "task-overdue") return true;
  return event.type === "task-due" && event.status !== "done" && event.date < today;
}

// La couleur de remplissage d'un événement : celle du statut pour une tâche, bleu pour une habitude.
export function eventColor(event: CalendarEvent): string {
  if (event.type === "habit") return EVENT_COLORS.habit;
  return EVENT_COLORS[event.status ?? "todo"];
}

// La phrase qui décrit un événement dans la liste du jour, par exemple "Doing · due this day · overdue".
export function describeEvent(event: CalendarEvent, today: string): string {
  if (event.type === "habit") return "Habit done";
  if (event.type === "task-done") return "Task completed";

  // Une tâche reportée sur aujourd'hui rappelle depuis quand elle est en retard.
  if (event.type === "task-overdue") {
    return [STATUS_LABEL[event.status ?? "todo"], `overdue since ${formatDate(event.dueDate ?? event.date)}`, `${event.priority} priority`].join(" · ");
  }

  const parts = [STATUS_LABEL[event.status ?? "todo"], event.type === "task-due" ? "due this day" : "added this day, no due date"];
  if (isOverdue(event, today)) parts.push("overdue");
  if (event.priority) parts.push(`${event.priority} priority`);
  return parts.join(" · ");
}
