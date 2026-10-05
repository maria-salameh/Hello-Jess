// La page du calendrier : un mois à la fois, avec les tâches et habitudes marquées en couleur,
// et la liste détaillée du jour sélectionné en dessous.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessages, type CalendarEvent, type CalendarResponse } from "../api";
import AppHeader from "../components/AppHeader";
import CalendarView, { eventClass } from "../components/CalendarView";
import ErrorList from "../components/ErrorList";
import {
  addMonths,
  browserTimeZone,
  endOfMonth,
  endOfWeek,
  formatDate,
  monthYear,
  startOfMonth,
  startOfWeek,
  todayLocal,
} from "../utils/dates";

// Le texte qui décrit le type d'un événement dans la liste du jour.
const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  "task-due": "Task due",
  "task-done": "Task completed",
  habit: "Habit done",
};

export default function Calendar() {
  const today = todayLocal();
  // Le mois affiché (son premier jour) et le jour sélectionné.
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // La grille commence le lundi de la première semaine du mois et finit le dimanche de la dernière.
  const gridStart = startOfWeek(month);
  const gridEnd = endOfWeek(endOfMonth(month));
  const tz = browserTimeZone();

  // Recharge les événements à l'ouverture et à chaque changement de mois.
  // Le fuseau horaire sert au backend à savoir à quel jour appartient une tâche terminée.
  useEffect(() => {
    api
      .get<CalendarResponse>("/calendar", { params: { from: gridStart, to: gridEnd, tz } })
      .then((res) => {
        setEvents(res.data.events);
        setErrors([]);
      })
      .catch((err) => setErrors(errorMessages(err)));
  }, [gridStart, gridEnd, tz]);

  // Passe au mois précédent ou suivant, ou revient à aujourd'hui.
  function goToMonth(newMonth: string) {
    setMonth(newMonth);
    // On sélectionne le jour 1 du nouveau mois (ou aujourd'hui si c'est le mois courant).
    setSelected(startOfMonth(today) === newMonth ? today : newMonth);
  }

  const dayEvents = events.filter((event) => event.date === selected);

  return (
    <div className="tasks-page stats-page">
      <AppHeader subtitle="Your tasks and habits by day" />
      <ErrorList messages={errors} />

      {/* La barre du mois : précédent, nom du mois, suivant et retour à aujourd'hui. */}
      <div className="calendar-toolbar">
        <button type="button" className="chip" onClick={() => goToMonth(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <h2>{monthYear(month)}</h2>
        <button type="button" className="chip" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Next month">
          ›
        </button>
        <button type="button" className="chip" onClick={() => goToMonth(startOfMonth(today))}>
          Today
        </button>
      </div>

      <CalendarView
        month={month}
        gridStart={gridStart}
        gridEnd={gridEnd}
        events={events}
        today={today}
        selected={selected}
        onSelect={setSelected}
      />

      {/* Le détail du jour sélectionné : chaque événement avec sa couleur ; les tâches ouvrent leur page de détail. */}
      <section className="stats-card">
        <h2>{formatDate(selected)}</h2>
        {dayEvents.length === 0 ? (
          <p className="stats-note">Nothing on this day.</p>
        ) : (
          <ul className="calendar-day-list">
            {dayEvents.map((event, index) => (
              <li key={index}>
                <i className={`calendar-dot ${eventClass(event, today)}`} />
                <div>
                  {event.taskId ? (
                    <Link className="task-title" to={`/tasks/${event.taskId}`}>
                      {event.title}
                    </Link>
                  ) : (
                    <Link className="task-title" to="/habits">
                      {event.title}
                    </Link>
                  )}
                  <span className="stats-note">
                    {TYPE_LABEL[event.type]}
                    {event.priority && event.type === "task-due" ? ` · ${event.priority} priority` : ""}
                    {event.status === "doing" ? " · in progress" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
