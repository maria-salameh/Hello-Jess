// Les couleurs et les textes des événements du calendrier (les mêmes que sur le site web).
import type { CalendarEvent } from "../api";

// Violet : tâche à faire ; rouge : tâche en retard ; vert : tâche terminée ; bleu : habitude réalisée.
export const EVENT_COLORS = {
  due: "#6c5ce7",
  overdue: "#e2574c",
  done: "#4caf82",
  habit: "#2ba3d6",
};

// La couleur d'un événement. Une tâche à faire dont la date est passée est en retard (rouge).
export function eventColor(event: CalendarEvent, today: string): string {
  if (event.type === "task-done") return EVENT_COLORS.done;
  if (event.type === "habit") return EVENT_COLORS.habit;
  return event.date < today ? EVENT_COLORS.overdue : EVENT_COLORS.due;
}

// Le texte qui décrit le type d'un événement dans la liste du jour.
export const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  "task-due": "Task due",
  "task-done": "Task completed",
  habit: "Habit done",
};
