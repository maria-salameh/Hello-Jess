// La page des habitudes (bonus B2) : créer des habitudes récurrentes et cocher, jour par jour, celles qu'on a réalisées.
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, errorMessages, type Habit } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { addDays, dayOfMonth, todayLocal, weekdayShort } from "../utils/dates";

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  // Les champs du formulaire "ajouter une habitude".
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // Les messages d'erreur du formulaire et ceux de la liste.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Les 7 derniers jours (du plus ancien à aujourd'hui), dans le calendrier du navigateur.
  const today = todayLocal();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  // Charge les habitudes avec les jours réalisés pendant ces 7 jours.
  const loadHabits = useCallback(async () => {
    try {
      const res = await api.get<Habit[]>("/habits", { params: { from: addDays(todayLocal(), -6), to: todayLocal() } });
      setHabits(res.data);
      setListErrors([]);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
    setLoading(false);
  }, []);

  // Charge la liste une fois, à l'ouverture de la page.
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Formulaire d'ajout : crée l'habitude, puis vide le formulaire et recharge la liste.
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    try {
      await api.post("/habits", { name, description });
      setName("");
      setDescription("");
      await loadHabits();
    } catch (err) {
      setFormErrors(errorMessages(err));
    }
  }

  // Coche ou décoche un jour : l'écran est mis à jour tout de suite, puis le backend est prévenu
  // (en cas d'échec on recharge pour revenir à l'état réel).
  async function toggleDay(habit: Habit, date: string) {
    const done = habit.completions?.includes(date) ?? false;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, completions: done ? h.completions?.filter((d) => d !== date) : [...(h.completions ?? []), date] }
          : h
      )
    );
    try {
      if (done) await api.delete(`/habits/${habit.id}/events/${date}`);
      else await api.post(`/habits/${habit.id}/events`, { date });
    } catch (err) {
      setListErrors(errorMessages(err));
      await loadHabits();
    }
  }

  // Supprime une habitude (et tous ses jours enregistrés), après confirmation.
  async function handleDelete(habit: Habit) {
    if (!window.confirm(`Delete "${habit.name}" and all its history?`)) return;
    try {
      await api.delete(`/habits/${habit.id}`);
      await loadHabits();
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  return (
    <div className="tasks-page">
      <AppHeader subtitle="Build habits, one day at a time" />

      {/* Formulaire pour ajouter une habitude : nom et description facultative. */}
      <form className="add-task-form" onSubmit={handleAdd}>
        <ErrorList messages={formErrors} />
        <div className="form-row">
          <input type="text" placeholder="New habit (e.g. Drink water)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
          <button type="submit">Add</button>
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
        />
      </form>

      <ErrorList messages={listErrors} />

      {/* La liste : chargement, message "aucune habitude", ou une carte par habitude avec ses 7 derniers jours. */}
      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : habits.length === 0 ? (
        <p className="empty-state">No habits yet — add one above.</p>
      ) : (
        <ul className="task-list">
          {habits.map((habit) => (
            <li key={habit.id} className="habit-item">
              <div className="habit-head">
                <div>
                  <div className="task-title">{habit.name}</div>
                  {habit.description && <div className="task-notes">{habit.description}</div>}
                </div>
                <button className="delete-btn" onClick={() => handleDelete(habit)} aria-label={`Delete ${habit.name}`}>
                  ×
                </button>
              </div>
              {/* Les 7 derniers jours : un bouton par jour, plein quand l'habitude a été réalisée ce jour-là. */}
              <div className="habit-days">
                {days.map((date) => {
                  const done = habit.completions?.includes(date) ?? false;
                  return (
                    <button
                      key={date}
                      type="button"
                      className={`habit-day ${done ? "done" : ""} ${date === today ? "today" : ""}`}
                      onClick={() => toggleDay(habit, date)}
                      aria-pressed={done}
                      aria-label={`${habit.name} on ${date}`}
                    >
                      <span>{weekdayShort(date)}</span>
                      <strong>{dayOfMonth(date)}</strong>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
