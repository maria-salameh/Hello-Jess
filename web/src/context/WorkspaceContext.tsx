// Keeps the workspaces of the logged-in user, the one being viewed, and the WebSocket connection that
// pushes changes from the other devices and members. Pages read it with useWorkspace().
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { WORKSPACE_KEY, api, type Workspace } from "../api";
import { createSocket } from "../realtime";
import { useAuth } from "./AuthContext";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  // The workspace being viewed (null until the list has loaded).
  current: Workspace | null;
  switchTo: (id: string) => void;
  refresh: () => Promise<void>;
  socket: Socket | null;
  connected: boolean;
  // Increases each time the socket reconnects after a drop, so pages reload what they may have missed.
  reconnects: number;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

const readStoredId = () => {
  try {
    return localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(readStoredId);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnects, setReconnects] = useState(0);

  const refresh = useCallback(async () => {
    const res = await api.get<Workspace[]>("/workspaces");
    setWorkspaces(res.data);
    // Fall back to the personal workspace when the remembered one is gone (for example after being removed).
    setCurrentId((id) => {
      const next = res.data.some((w) => w.id === id) ? id : (res.data.find((w) => w.isPersonal) ?? res.data[0])?.id ?? null;
      if (next) localStorage.setItem(WORKSPACE_KEY, next);
      return next;
    });
  }, []);

  // Load the workspaces and open the socket when someone is logged in; clean up when they log out.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setWorkspaces([]);
      return;
    }
    refresh().catch(() => undefined);

    const token = localStorage.getItem("hellojess_token") ?? "";
    const live = createSocket(token);
    let hasConnected = false;
    live.on("connect", () => {
      setConnected(true);
      if (hasConnected) setReconnects((n) => n + 1);
      hasConnected = true;
    });
    live.on("disconnect", () => setConnected(false));
    live.on("workspace:updated", () => refresh().catch(() => undefined));
    live.on("workspace:removed", () => refresh().catch(() => undefined));
    setSocket(live);

    return () => {
      live.close();
      setSocket(null);
      setConnected(false);
    };
  }, [userId, refresh]);

  const switchTo = useCallback((id: string) => {
    localStorage.setItem(WORKSPACE_KEY, id);
    setCurrentId(id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      current: workspaces.find((w) => w.id === currentId) ?? null,
      switchTo,
      refresh,
      socket,
      connected,
      reconnects,
    }),
    [workspaces, currentId, switchTo, refresh, socket, connected, reconnects],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
