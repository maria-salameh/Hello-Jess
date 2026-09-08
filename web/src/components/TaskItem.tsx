import type { Task } from "../api";

type Props = {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <li className={`task-item priority-${task.priority} ${task.completed ? "completed" : ""}`}>
      <label className="task-checkbox">
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />
        <span className="checkmark" />
      </label>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.notes && <div className="task-notes">{task.notes}</div>}
        <div className="task-meta">
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.due_date && (
            <span className="due-date">Due {new Date(task.due_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <button className="delete-btn" onClick={() => onDelete(task)} aria-label="Delete task">
        ×
      </button>
    </li>
  );
}
