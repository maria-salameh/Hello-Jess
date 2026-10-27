// Shared notes: everyone in the workspace sees edits as they are typed, on every device.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessages, type Note } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

// How long to wait after the last keystroke before sending the edit.
const SEND_DELAY_MS = 400;

type SaveState = "saved" | "saving" | "error";

export default function Notes() {
  const { user } = useAuth();
  const { socket, current } = useWorkspace();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The text being typed. It is kept apart from `notes` so an incoming edit never moves the cursor while typing.
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // True from the first keystroke until the server has acknowledged the edit.
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const open = useCallback((note: Note | null) => {
    clearTimeout(timer.current);
    dirty.current = false;
    setSelectedId(note?.id ?? null);
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setSaveState("saved");
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Note[]>("/notes");
      setNotes(res.data);
      setErrors([]);
      // Keep the open note if it still exists; otherwise show the first one.
      const stillThere = res.data.find((n) => n.id === selectedRef.current);
      if (!stillThere && !dirty.current) open(res.data[0] ?? null);
    } catch (err) {
      setErrors(errorMessages(err));
    }
    setLoading(false);
  }, [open]);

  useLiveRefresh([], load);

  // Live changes from other devices and members.
  useEffect(() => {
    if (!socket) return;
    const onCreated = (note: Note) => setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [note, ...prev]));
    const onUpdated = (note: Note) => {
      setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
      // Show someone else's edit in the open note, unless the user has unsent typing (last write wins on send).
      if (note.id === selectedRef.current && note.updatedById !== user?.id && !dirty.current) {
        setTitle(note.title);
        setContent(note.content);
      }
    };
    const onDeleted = ({ id }: { id: string }) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (id === selectedRef.current) open(null);
    };
    socket.on("note:created", onCreated);
    socket.on("note:updated", onUpdated);
    socket.on("note:deleted", onDeleted);
    return () => {
      socket.off("note:created", onCreated);
      socket.off("note:updated", onUpdated);
      socket.off("note:deleted", onDeleted);
    };
  }, [socket, user?.id, open]);

  // Sends the edit over the WebSocket; falls back to HTTP when the socket is down.
  const send = useCallback(
    async (id: string, changes: { title: string; content: string }) => {
      setSaveState("saving");
      try {
        if (socket?.connected) {
          const ack = await socket.timeout(5000).emitWithAck("note:edit", { id, workspaceId: current?.id, ...changes });
          if (!ack.ok) throw new Error(ack.detail);
        } else {
          await api.patch(`/notes/${id}`, changes);
        }
        dirty.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [socket, current?.id],
  );

  function edit(changes: Partial<{ title: string; content: string }>) {
    if (!selectedId) return;
    const next = { title, content, ...changes };
    setTitle(next.title);
    setContent(next.content);
    dirty.current = true;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(selectedId, next), SEND_DELAY_MS);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleAdd() {
    try {
      const res = await api.post<Note>("/notes", { title: "Untitled note" });
      setNotes((prev) => (prev.some((n) => n.id === res.data.id) ? prev : [res.data, ...prev]));
      open(res.data);
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  async function handleDelete(note: Note) {
    if (!window.confirm(`Delete "${note.title || "Untitled note"}" for everyone in this workspace?`)) return;
    try {
      await api.delete(`/notes/${note.id}`);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (note.id === selectedId) open(null);
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  const editor = current?.members.find((m) => m.id === selected?.updatedById);

  return (
    <div className="tasks-page">
      <AppHeader subtitle={`Notes shared in ${current?.name ?? "your workspace"}`} />
      <ErrorList messages={errors} />

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : (
        <div className="notes-layout">
          <aside className="notes-list">
            <button type="button" className="primary-btn" onClick={handleAdd}>
              New note
            </button>
            {notes.length === 0 ? (
              <p className="empty-state">No notes yet.</p>
            ) : (
              <ul>
                {notes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      className={`note-link ${note.id === selectedId ? "active" : ""}`}
                      onClick={() => open(note)}
                    >
                      <strong>{note.title || "Untitled note"}</strong>
                      <span>{note.content.slice(0, 60) || "Empty"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="note-editor">
            {selected ? (
              <>
                <div className="note-editor-head">
                  <input
                    type="text"
                    value={title}
                    maxLength={120}
                    onChange={(e) => edit({ title: e.target.value })}
                    aria-label="Note title"
                    placeholder="Title"
                  />
                  <button className="delete-btn" onClick={() => handleDelete(selected)} aria-label="Delete note">
                    ×
                  </button>
                </div>
                <textarea
                  value={content}
                  maxLength={20000}
                  onChange={(e) => edit({ content: e.target.value })}
                  aria-label="Note content"
                  placeholder="Start typing..."
                />
                <p className="note-status" role="status">
                  {saveState === "saving" && "Saving..."}
                  {saveState === "saved" && `Saved${editor && editor.id !== user?.id ? ` · last edit by ${editor.name}` : ""}`}
                  {saveState === "error" && "Could not save. Your text is still here; keep typing to retry."}
                </p>
              </>
            ) : (
              <p className="empty-state">Pick a note, or create one.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
