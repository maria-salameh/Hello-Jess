// Workspaces: create a shared one, invite people by email, or leave.
import { useState } from "react";
import type { FormEvent } from "react";
import { api, errorMessages, type Workspace } from "../api";
import AppHeader from "../components/AppHeader";
import ErrorList from "../components/ErrorList";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Workspaces() {
  const { user } = useAuth();
  const { workspaces, current, switchTo, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  async function run(action: () => Promise<unknown>) {
    setErrors([]);
    try {
      await action();
      await refresh();
    } catch (err) {
      setErrors(errorMessages(err));
    }
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const res = await api.post<Workspace>("/workspaces", { name });
      setName("");
      switchTo(res.data.id);
    });
  }

  function handleInvite(e: FormEvent, workspace: Workspace) {
    e.preventDefault();
    void run(async () => {
      await api.post(`/workspaces/${workspace.id}/members`, { email: emails[workspace.id] ?? "" });
      setEmails((prev) => ({ ...prev, [workspace.id]: "" }));
    });
  }

  function handleRemove(workspace: Workspace, memberId: string) {
    const leaving = memberId === user?.id;
    if (!window.confirm(leaving ? `Leave "${workspace.name}"?` : "Remove this member?")) return;
    void run(() => api.delete(`/workspaces/${workspace.id}/members/${memberId}`));
  }

  return (
    <div className="tasks-page">
      <AppHeader subtitle="Share tasks, notes and timers with other people" />

      <form className="add-task-form" onSubmit={handleCreate}>
        <div className="form-row">
          <input type="text" placeholder="New shared workspace (e.g. Flat 4B)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Workspace name" />
          <button type="submit">Create</button>
        </div>
      </form>

      <ErrorList messages={errors} />

      <ul className="task-list">
        {workspaces.map((workspace) => {
          const isOwner = workspace.ownerId === user?.id;
          return (
            <li key={workspace.id} className="workspace-item">
              <div className="habit-head">
                <div>
                  <div className="task-title">
                    {workspace.name} {workspace.isPersonal && <span className="badge badge-low">personal</span>}
                    {workspace.id === current?.id && <span className="badge badge-medium">viewing</span>}
                  </div>
                  <ul className="member-list">
                    {workspace.members.map((member) => (
                      <li key={member.id}>
                        {member.name} <span className="task-notes">{member.email}</span>
                        {member.role === "owner" && <span className="task-notes"> · owner</span>}
                        {member.role !== "owner" && (isOwner || member.id === user?.id) && (
                          <button type="button" className="link-btn" onClick={() => handleRemove(workspace, member.id)}>
                            {member.id === user?.id ? "Leave" : "Remove"}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {workspace.id !== current?.id && (
                  <button type="button" className="chip" onClick={() => switchTo(workspace.id)}>
                    Switch to it
                  </button>
                )}
              </div>
              {isOwner && !workspace.isPersonal && (
                <form className="form-row" onSubmit={(e) => handleInvite(e, workspace)}>
                  <input
                    type="email"
                    placeholder="Invite by email (they need an account)"
                    value={emails[workspace.id] ?? ""}
                    onChange={(e) => setEmails((prev) => ({ ...prev, [workspace.id]: e.target.value }))}
                    aria-label={`Invite to ${workspace.name}`}
                  />
                  <button type="submit">Invite</button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
