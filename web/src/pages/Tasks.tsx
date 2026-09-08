import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, type Task } from "../api";
import { useAuth } from "../context/AuthContext";
import TaskItem from "../components/TaskItem";

export default function Tasks() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  async function loadTasks() {
    const res = await api.get<Task[]>("/tasks");
    setTasks(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post("/tasks", {
      title,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setTitle("");
    setPriority("medium");
    setDueDate("");
    loadTasks();
  }

  async function handleToggle(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    await api.delete(`/tasks/${task.id}`);
  }

  const visibleTasks = showCompleted ? tasks : tasks.filter((t) => !t.completed);
  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <div className="tasks-page">
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

      <label className="show-completed">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
        />
        Show completed
      </label>

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
