// La grille d'un mois du calendrier : une case par jour (du lundi au dimanche), avec les événements
// du jour affichés en couleur :
// - violet : tâche à faire (rouge si l'échéance est dépassée)   - vert : tâche terminée   - bleu : habitude réalisée
import type { CalendarEvent } from "../api";
import { addDays, dayOfMonth } from "../utils/dates";

// Combien d'événements on montre dans une case avant d'écrire "+ N more".
const MAX_VISIBLE = 3;

// Les jours de la semaine affichés en haut de la grille.
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// La classe CSS (donc la couleur) d'un événement. Une tâche à faire dont la date est passée est "overdue" (rouge).
export function eventClass(event: CalendarEvent, today: string): string {
  if (event.type === "task-done") return "done";
  if (event.type === "habit") return "habit";
  return event.date < today ? "overdue" : "due";
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
          <i className="calendar-dot due" /> Task due
        </span>
        <span>
          <i className="calendar-dot overdue" /> Overdue
        </span>
        <span>
          <i className="calendar-dot done" /> Task completed
        </span>
        <span>
          <i className="calendar-dot habit" /> Habit done
        </span>
      </div>
    </div>
  );
}
