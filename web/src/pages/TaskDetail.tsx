// La page de détail d'une tâche : on y voit toutes ses informations, on peut les modifier ou supprimer la tâche.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, errorMessages, type Priority, type Task, type TaskStatus } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { formatDateTime } from "../utils/dates";

export default function TaskDetail() {
  // L'id de la tâche est dans l'URL : /tasks/<id>.
  const { id } = useParams();
  const navigate = useNavigate();
  // La tâche telle qu'enregistrée (pour afficher les dates), et le formulaire de modification.
  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  // Messages d'erreur, confirmation d'enregistrement, chargement et tâche introuvable.
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Recopie une tâche dans les champs du formulaire.
  function fillForm(loaded: Task) {
    setTask(loaded);
    setTitle(loaded.title);
    setDescription(loaded.description);
    setStatus(loaded.status);
    setPriority(loaded.priority);
    setDueDate(loaded.dueDate ?? "");
  }

  // Charge la tâche à l'ouverture de la page. Une tâche inconnue (ou celle d'un autre utilisateur) donne "introuvable".
  useEffect(() => {
    api
      .get<Task>(`/tasks/${id}`)
      .then((res) => fillForm(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Enregistre les modifications ; les erreurs de validation du backend s'affichent au-dessus du formulaire.
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSaved(false);
    try {
      const res = await api.patch<Task>(`/tasks/${id}`, {
        title,
        status,
        description,
        priority,
        dueDate: dueDate || null,
      });
      fillForm(res.data);
      setSaved(true);
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  // Supprime la tâche, puis retourne à la liste.
  async function handleDelete() {
    try {
      await api.delete(`/tasks/${id}`);
      navigate("/");
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  return (
    <div className="tasks-page">
      <AppHeader subtitle="Task details" />
      <Link className="back-link" to="/">
        ← Back to tasks
      </Link>

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : notFound || !task ? (
        <p className="empty-state">This task doesn't exist.</p>
      ) : (
        <form className="detail-card" onSubmit={handleSave}>
          <ErrorList messages={errors} />
          {saved && <div className="success">Saved.</div>}

          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Description
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                <option value="todo">To do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          {/* Les dates gérées par le serveur : lecture seule. */}
          <div className="detail-meta">
            <span>Created: {formatDateTime(task.createdAt)}</span>
            <span>Updated: {formatDateTime(task.updatedAt)}</span>
            {task.completedAt && <span>Completed: {formatDateTime(task.completedAt)}</span>}
          </div>

          <div className="form-row">
            <button type="submit">Save changes</button>
            <button type="button" className="danger-btn" onClick={handleDelete}>
              Delete task
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
