// Shared countdown timers: start one on your laptop and the whole workspace sees it running.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, errorMessages, type SharedTimer } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import { clockOffset, formatDuration, remainingMs } from "../utils/timer";

type Action = "start" | "pause" | "reset";

export default function Timers() {
  const { socket } = useWorkspace();
  const [timers, setTimers] = useState<SharedTimer[]>([]);
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // Redraws the countdowns four times a second while a timer runs.
  const [now, setNow] = useState(() => Date.now());
  // Server clock minus device clock, per timer, measured when the timer was last received.
  const offsets = useRef(new Map<string, number>());

  const receive = useCallback((timer: SharedTimer) => {
    offsets.current.set(timer.id, clockOffset(timer.serverTime));
    setTimers((prev) => (prev.some((t) => t.id === timer.id) ? prev.map((t) => (t.id === timer.id ? timer : t)) : [...prev, timer]));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get<SharedTimer[]>("/timers");
      res.data.forEach((t) => offsets.current.set(t.id, clockOffset(t.serverTime)));
      setTimers(res.data);
      setListErrors([]);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
    setLoading(false);
  }, []);

  useLiveRefresh([], load);

  useEffect(() => {
    if (!socket) return;
    const onDeleted = ({ id }: { id: string }) => setTimers((prev) => prev.filter((t) => t.id !== id));
    socket.on("timer:created", receive);
    socket.on("timer:updated", receive);
    socket.on("timer:deleted", onDeleted);
    return () => {
      socket.off("timer:created", receive);
      socket.off("timer:updated", receive);
      socket.off("timer:deleted", onDeleted);
    };
  }, [socket, receive]);

  const anyRunning = timers.some((t) => t.status === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [anyRunning]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    try {
      const res = await api.post<SharedTimer>("/timers", { label, durationSeconds: Math.round(Number(minutes) * 60) });
      receive(res.data);
      setLabel("");
    } catch (err) {
      setFormErrors(errorMessages(err));
    }
  }

  async function act(timer: SharedTimer, action: Action) {
    try {
      receive((await api.post<SharedTimer>(`/timers/${timer.id}/action`, { action })).data);
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  async function handleDelete(timer: SharedTimer) {
    try {
      await api.delete(`/timers/${timer.id}`);
      setTimers((prev) => prev.filter((t) => t.id !== timer.id));
    } catch (err) {
      setListErrors(errorMessages(err));
    }
  }

  return (
    <div className="tasks-page">
      <AppHeader subtitle="Timers everyone in the workspace can see" />

      <form className="add-task-form" onSubmit={handleAdd}>
        <ErrorList messages={formErrors} />
        <div className="form-row">
          <input type="text" placeholder="New timer (e.g. Focus)" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Label" />
          <input
            type="number"
            min="0.5"
            max="1440"
            step="0.5"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-label="Minutes"
            className="minutes-input"
          />
          <button type="submit">Add</button>
        </div>
      </form>

      <ErrorList messages={listErrors} />

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : timers.length === 0 ? (
        <p className="empty-state">No timers yet — add one above.</p>
      ) : (
        <ul className="task-list">
          {timers.map((timer) => {
            const left = remainingMs(timer, now, offsets.current.get(timer.id) ?? 0);
            const finished = timer.status !== "idle" && left === 0;
            return (
              <li key={timer.id} className={`timer-item ${timer.status}`}>
                <div>
                  <div className="task-title">{timer.label}</div>
                  <div className="task-notes">{finished ? "Done" : timer.status}</div>
                </div>
                <div className="timer-clock" aria-label={`${timer.label} time left`}>
                  {formatDuration(left)}
                </div>
                <div className="timer-actions">
                  {timer.status === "running" ? (
                    <button type="button" onClick={() => act(timer, "pause")}>
                      Pause
                    </button>
                  ) : (
                    <button type="button" onClick={() => act(timer, "start")}>
                      {timer.status === "paused" ? "Resume" : "Start"}
                    </button>
                  )}
                  <button type="button" onClick={() => act(timer, "reset")}>
                    Reset
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(timer)} aria-label={`Delete ${timer.label}`}>
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
