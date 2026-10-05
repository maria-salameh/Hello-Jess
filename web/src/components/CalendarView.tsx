// La grille d'un mois du calendrier : une case par jour (du lundi au dimanche), avec les événements
// du jour affichés en couleur. La couleur d'une tâche dépend de son statut :
// - violet : à faire   - orange : en cours   - vert : terminée   - bleu : habitude réalisée
// Une tâche à faire ou en cours dont l'échéance est dépassée garde la couleur de son statut mais est entourée de rouge.
import type { CalendarEvent } from "../api";
import { addDays, dayOfMonth, formatDate } from "../utils/dates";

// Combien d'événements on montre dans une case avant d'écrire "+ N more".
const MAX_VISIBLE = 3;

// Les jours de la semaine affichés en haut de la grille.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Les noms des statuts, tels qu'affichés dans la liste du jour.
const STATUS_LABEL = { todo: "To do", doing: "Doing", done: "Done" };

// Une tâche est en retard si elle est à faire ou en cours et que son échéance est passée : soit elle est affichée
// à son échéance (qui est avant aujourd'hui), soit elle a été reportée sur aujourd'hui ("task-overdue").
export function isOverdue(event: CalendarEvent, today: string): boolean {
  if (event.type === "task-overdue") return true;
  return event.type === "task-due" && event.status !== "done" && event.date < today;
}

// Les classes CSS (donc les couleurs) d'un événement : le statut pour une tâche ("todo", "doing" ou "done"),
// "habit" pour une habitude, plus "overdue" (contour rouge) si la tâche est en retard.
export function eventClass(event: CalendarEvent, today: string): string {
  if (event.type === "habit") return "habit";
  return `${event.status ?? "todo"}${isOverdue(event, today) ? " overdue" : ""}`;
}

// La phrase qui décrit un événement dans la liste du jour, par exemple "Doing · due this day · overdue".
export function describeEvent(event: CalendarEvent, today: string): string {
  if (event.type === "habit") return "Habit done";
  if (event.type === "task-done") return "Task completed";

  const status = STATUS_LABEL[event.status ?? "todo"];
  // Une tâche reportée sur aujourd'hui rappelle depuis quand elle est en retard.
  if (event.type === "task-overdue") {
    return [status, `overdue since ${formatDate(event.dueDate ?? event.date)}`, `${event.priority} priority`].join(" · ");
  }

  const when = event.type === "task-due" ? "due this day" : "added this day, no due date";
  const parts = [status, when];
  if (isOverdue(event, today)) parts.push("overdue");
  if (event.priority) parts.push(`${event.priority} priority`);
  return parts.join(" · ");
}

type Props = {
  month: string; // le premier jour du mois affiché, "YYYY-MM-01"
  gridStart: string; // le lundi par lequel commence la grille
  gridEnd: string; // le dimanche par lequel elle finit
  events: CalendarEvent[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
};

export default function CalendarView({ month, gridStart, gridEnd, events, today, selected, onSelect }: Props) {
  // Tous les jours de la grille, du lundi de la première semaine au dimanche de la dernière.
  const days: string[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);

  // Range les événements par jour pour les retrouver vite en dessinant chaque case.
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (!eventsByDay.has(event.date)) eventsByDay.set(event.date, []);
    eventsByDay.get(event.date)!.push(event);
  }

  return (
    <div className="calendar">
      {/* La ligne des noms de jours. */}
      <div className="calendar-weekdays">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday}>{weekday}</div>
        ))}
      </div>

      {/* La grille : 7 colonnes ; les jours des mois voisins sont grisés. */}
      <div className="calendar-grid">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day) ?? [];
          const outside = day.slice(0, 7) !== month.slice(0, 7);
          return (
            <button
              key={day}
              type="button"
              className={`calendar-cell ${outside ? "outside" : ""} ${day === today ? "today" : ""} ${day === selected ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-label={`${day}: ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
            >
              <span className="calendar-day-number">{dayOfMonth(day)}</span>
              {/* Les premiers événements du jour, chacun dans sa couleur. */}
              {dayEvents.slice(0, MAX_VISIBLE).map((event, index) => (
                <span key={index} className={`calendar-event ${eventClass(event, today)}`} title={event.title}>
                  {event.title}
                </span>
              ))}
              {dayEvents.length > MAX_VISIBLE && (
                <span className="calendar-more">+ {dayEvents.length - MAX_VISIBLE} more</span>
              )}
            </button>
          );
        })}
      </div>

      {/* La légende des couleurs. */}
      <div className="calendar-legend">
        <span>
          <i className="calendar-dot todo" /> To do
        </span>
        <span>
          <i className="calendar-dot doing" /> Doing
        </span>
        <span>
          <i className="calendar-dot done" /> Done
        </span>
        <span>
          <i className="calendar-dot habit" /> Habit
        </span>
        <span>
          <i className="calendar-dot overdue ring" /> Overdue (red outline)
        </span>
      </div>
    </div>
  );
}
