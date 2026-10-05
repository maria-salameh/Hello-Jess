// Une ligne de la liste : case à cocher, titre, notes, priorité, date limite et bouton de suppression.
import type { Task } from "../api";

// Ce que le composant reçoit : la tâche à afficher et ce qu'il faut faire quand on la coche ou la supprime.
type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    // Les classes CSS donnent la couleur de bordure selon la priorité et l'aspect grisé des tâches terminées.
    <li className={`task-item priority-${task.priority} ${task.completed ? "completed" : ""}`}>
      <label className="task-checkbox">
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
        <span className="checkmark" />
      </label>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {/* Les notes ne sont affichées que s'il y en a. */}
        {task.notes && <div className="task-notes">{task.notes}</div>}
        <div className="task-meta">
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {/* La date limite n'est affichée que s'il y en a une. */}
          {task.due_date && (
            // Affichée en UTC : la date est enregistrée à minuit UTC, donc le fuseau horaire local la décalerait d'un jour.
            <span className="due-date">
              Due {new Date(task.due_date).toLocaleDateString(undefined, { timeZone: "UTC" })}
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
