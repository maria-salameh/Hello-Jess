// La page principale après connexion : afficher, ajouter, cocher et supprimer ses tâches.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, type Task } from "../api";
import { useAuth } from "../context/AuthContext";
import TaskItem from "../components/TaskItem";

export default function Tasks() {
  const { user, logout } = useAuth();
  // La liste des tâches telle que reçue du backend.
  const [tasks, setTasks] = useState<Task[]>([]);
  // Les champs du formulaire "ajouter une tâche".
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  // Vaut true tant que la première liste n'est pas arrivée.
  const [loading, setLoading] = useState(true);
  // Case à cocher "Show completed" : afficher ou masquer les tâches terminées.
  const [showCompleted, setShowCompleted] = useState(true);

  // Demande la liste au backend et la range dans l'état.
  async function loadTasks() {
    const res = await api.get<Task[]>("/tasks");
    setTasks(res.data);
    setLoading(false);
  }

  // Charge la liste une fois, à l'ouverture de la page.
  useEffect(() => {
    loadTasks();
  }, []);

  // Formulaire d'ajout : envoie la nouvelle tâche, vide le formulaire, puis recharge la liste.
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    // Ignore un titre vide ou fait uniquement d'espaces.
    if (!title.trim()) return;
    await api.post("/tasks", {
      title,
      priority,
      // La date choisie est convertie en texte ISO ; sans date on envoie null.
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setTitle("");
    setPriority("medium");
    setDueDate("");
    loadTasks();
  }

  // Coche/décoche une tâche : l'écran est mis à jour tout de suite, puis le backend est prévenu.
  async function handleToggle(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
  }

  // Supprime une tâche : retirée de l'écran tout de suite, puis supprimée côté backend.
  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await api.delete(`/tasks/${task.id}`);
  }

  // Les tâches à afficher (selon la case "Show completed") et le nombre de tâches encore à faire.
  const visibleTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <div className="tasks-page">
      {/* En-tête : titre, message de bienvenue avec le nombre de tâches restantes, bouton de déconnexion. */}
      <header className="tasks-header">
        <div>
          <h1>HelloJess</h1>
          <p className="subtitle">
            Hi {user?.name} — {remaining} task{remaining === 1 ? "" : "s"} left
          </p>
        </div>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </header>

      {/* Formulaire pour ajouter une tâche : titre, priorité, date limite. */}
      <form className="add-task-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Add a new task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      {/* Case à cocher pour afficher ou masquer les tâches terminées. */}
      <label className="show-completed">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
        />
        Show completed
      </label>

      {/* La liste : message de chargement, message "aucune tâche", ou une ligne par tâche. */}
      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : visibleTasks.length === 0 ? (
        <p className="empty-state">No tasks yet — add one above.</p>
      ) : (
        <ul className="task-list">
          {visibleTasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}
