// Une ligne de la liste : case à cocher, titre (lien vers le détail), description, statut, priorité, échéance et suppression.
import { Link } from "react-router-dom";
import type { Task, TaskStatus } from "../api";
import { formatDate, todayLocal } from "../utils/dates";

// Ce que le composant reçoit : la tâche à afficher et ce qu'il faut faire quand on change son statut ou qu'on la supprime.
type Props = {
  task: Task;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onDelete: (task: Task) => void;
};

export default function TaskItem({ task, onStatusChange, onDelete }: Props) {
  // Une tâche est en retard si son échéance est passée et qu'elle n'est pas terminée.
  const overdue = task.status !== "done" && task.dueDate !== null && task.dueDate < todayLocal();

  return (
    // Les classes CSS donnent la couleur de bordure selon la priorité et l'aspect grisé des tâches terminées.
    <li className={`task-item priority-${task.priority} ${task.status === "done" ? "completed" : ""}`}>
      {/* La case à cocher bascule entre "terminée" et "à faire". */}
      <label className="task-checkbox">
        <input
          type="checkbox"
          checked={task.status === "done"}
          onChange={() => onStatusChange(task, task.status === "done" ? "todo" : "done")}
        />
        <span className="checkmark" />
      </label>
      <div className="task-body">
        {/* Le titre ouvre la page de détail et de modification. */}
        <Link className="task-title" to={`/tasks/${task.id}`}>
          {task.title}
        </Link>
        {/* La description n'est affichée que s'il y en a une (elle est raccourcie par le CSS si elle est longue). */}
        {task.description && <div className="task-notes">{task.description}</div>}
        <div className="task-meta">
          {/* Menu pour changer rapidement le statut (à faire / en cours / terminée). */}
          <select
            className="status-select"
            value={task.status}
            aria-label="Status"
            onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
          >
            <option value="todo">To do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {/* L'échéance n'est affichée que s'il y en a une ; "Overdue" signale un retard. */}
          {task.dueDate && (
            <span className={`due-date ${overdue ? "overdue" : ""}`}>
              Due {formatDate(task.dueDate)}
              {overdue ? " · Overdue" : ""}
            </span>
          )}
        </div>
      </div>
      <button className="delete-btn" onClick={() => onDelete(task)} aria-label="Delete task">
        ×
      </button>
    </li>
  );
}
