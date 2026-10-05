// La page principale après connexion : afficher, filtrer, ajouter, changer le statut et supprimer ses tâches.
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, errorMessages, type Priority, type Task, type TaskCount, type TaskStatus } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import TaskItem from "../components/TaskItem";
import { addDays, todayLocal } from "../utils/dates";

// Les valeurs possibles des trois filtres (bonus B1).
type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | Priority;
type DueFilter = "all" | "overdue" | "today" | "week" | "none";

// Les boutons de statut (avec le compteur affiché à côté) et leur texte.
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];

// Transforme les trois filtres choisis en paramètres d'URL pour le backend.
// Les échéances "aujourd'hui", "cette semaine"... sont calculées ici, avec la date du navigateur.
function buildParams(status: StatusFilter, priority: PriorityFilter, due: DueFilter) {
  const params: Record<string, string> = {};
  if (status !== "all") params.status = status;
  if (priority !== "all") params.priority = priority;

  const today = todayLocal();
  if (due === "overdue") params.dueTo = addDays(today, -1);
  if (due === "today") {
    params.dueFrom = today;
    params.dueTo = today;
  }
  if (due === "week") {
    params.dueFrom = today;
    params.dueTo = addDays(today, 6);
  }
  if (due === "none") params.noDueDate = "true";
  return params;
}

export default function Tasks() {
  // La liste affichée et le compteur de tâches par statut.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [count, setCount] = useState<TaskCount | null>(null);
  // Les filtres choisis.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  // Les champs du formulaire "ajouter une tâche".
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  // Les messages d'erreur du formulaire d'ajout et ceux de la liste.
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [listErrors, setListErrors] = useState<string[]>([]);
  // Vaut true tant que la première liste n'est pas arrivée.
  const [loading, setLoading] = useState(true);

  // Demande au backend la liste filtrée et le compteur, puis les range dans l'état.
  const loadTasks = useCallback(async () => {
    try {
      const [list, counts] = await Promise.all([
        api.get<Task[]>("/tasks", { params: buildParams(statusFilter, priorityFilter, dueFilter) }),
        api.get<TaskCount>("/tasks/count"),
      ]);
      // "En retard" ne concerne que les tâches non terminées (le backend filtre seulement sur la date).
      setTasks(dueFilter === "overdue" ? list.data.filter((task) => task.status !== "done") : list.data);
      setCount(counts.data);
      setListErrors([]);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
    setLoading(false);
  }, [statusFilter, priorityFilter, dueFilter]);

  // Recharge la liste à l'ouverture de la page et à chaque changement de filtre.
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Formulaire d'ajout : envoie la nouvelle tâche, puis vide le formulaire et recharge la liste.
  // Les erreurs de validation du backend (titre vide, date impossible...) s'affichent au-dessus du formulaire.
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    try {
      await api.post("/tasks", { title, status, description, priority, dueDate: dueDate || null });
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      await loadTasks();
    } catch (err) {
      setFormErrors(errorMessages(err));
    }
  }

  // Change le statut d'une tâche (case à cocher ou menu), puis recharge pour remettre la liste et le compteur à jour.
  async function handleStatusChange(task: Task, newStatus: TaskStatus) {
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      await loadTasks();
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  // Supprime une tâche, puis recharge la liste et le compteur.
  async function handleDelete(task: Task) {
    try {
      await api.delete(`/tasks/${task.id}`);
      await loadTasks();
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  const filtersActive = statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all";

  return (
    <div className="tasks-page">
      <AppHeader subtitle={count ? `${count.todo + count.doing} open · ${count.done} done` : undefined} />

      {/* Formulaire pour ajouter une tâche : titre, description, statut, priorité, échéance. */}
      <form className="add-task-form" onSubmit={handleAdd}>
        <ErrorList messages={formErrors} />
        <div className="form-row">
          <input
            type="text"
            placeholder="Add a new task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
          />
          <button type="submit">Add</button>
        </div>
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
        />
        <div className="form-row">
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} aria-label="Status">
            <option value="todo">To do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        </div>
      </form>

      {/* Filtres (bonus B1) : boutons de statut avec le compteur, puis priorité et échéance. */}
      <div className="filters">
        <div className="chips">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`chip ${statusFilter === filter.value ? "active" : ""}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              {/* Le compteur : total pour "All", sinon le nombre de tâches de ce statut. */}
              {count && <span className="chip-count">{filter.value === "all" ? count.total : count[filter.value]}</span>}
            </button>
          ))}
        </div>
        <div className="filter-selects">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            aria-label="Filter by priority"
          >
            <option value="all">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter)} aria-label="Filter by due date">
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="week">Next 7 days</option>
            <option value="none">No due date</option>
          </select>
        </div>
      </div>

      <ErrorList messages={listErrors} />

      {/* La liste : message de chargement, message "aucune tâche", ou une ligne par tâche. */}
      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="empty-state">{filtersActive ? "No tasks match these filters." : "No tasks yet — add one above."}</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
