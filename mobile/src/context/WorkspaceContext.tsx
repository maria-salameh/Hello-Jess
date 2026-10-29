// Garde les espaces de travail de l'utilisateur connecté, celui qu'il regarde, et la connexion WebSocket
// qui apporte les changements des autres appareils et des autres membres. Les écrans lisent tout ça avec useWorkspace().
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Socket } from "socket.io-client";
import { api, TOKEN_KEY, WORKSPACE_KEY, type Workspace } from "../api";
import { createSocket } from "../realtime";
import { useAuth } from "./AuthContext";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  // L'espace de travail affiché (null tant que la liste n'est pas arrivée).
  current: Workspace | null;
  switchTo: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  socket: Socket | null;
  connected: boolean;
  // Augmente à chaque reconnexion après une coupure, pour que les écrans rechargent ce qu'ils ont pu rater.
  reconnects: number;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnects, setReconnects] = useState(0);

  const refresh = useCallback(async () => {
    const res = await api.get<Workspace[]>("/workspaces");
    setWorkspaces(res.data);
    // Retombe sur l'espace personnel quand celui qui était retenu a disparu (par exemple après en avoir été retiré).
    const stored = await AsyncStorage.getItem(WORKSPACE_KEY);
    const next = res.data.some((w) => w.id === stored) ? stored : (res.data.find((w) => w.isPersonal) ?? res.data[0])?.id ?? null;
    if (next) await AsyncStorage.setItem(WORKSPACE_KEY, next);
    setCurrentId(next);
  }, []);

  // Charge les espaces de travail et ouvre le socket quand quelqu'un est connecté ; nettoie à la déconnexion.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setWorkspaces([]);
      setCurrentId(null);
      return;
    }
    let live: Socket | null = null;
    let cancelled = false;

    (async () => {
      await refresh().catch(() => undefined);
      const token = (await AsyncStorage.getItem(TOKEN_KEY)) ?? "";
      if (cancelled) return;
      live = createSocket(token);
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
    })();

    return () => {
      cancelled = true;
      live?.close();
      setSocket(null);
      setConnected(false);
    };
  }, [userId, refresh]);

  const switchTo = useCallback(async (id: string) => {
    // Sauvegardé avant de changer l'état : les requêtes qui suivent lisent déjà le bon espace.
    await AsyncStorage.setItem(WORKSPACE_KEY, id);
    setCurrentId(id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspaces, current: workspaces.find((w) => w.id === currentId) ?? null, switchTo, refresh, socket, connected, reconnects }),
    [workspaces, currentId, switchTo, refresh, socket, connected, reconnects],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
