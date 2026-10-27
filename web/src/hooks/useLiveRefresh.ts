import { useEffect } from "react";
import { useWorkspace } from "../context/WorkspaceContext";

// Runs `load` when the page opens, and again whenever the data may have changed: another device or member
// pushed one of `events`, the user switched workspace, or the socket reconnected after a drop.
// `load` must be stable between renders (wrap it in useCallback) so it only re-runs for a reason.
export function useLiveRefresh(events: readonly string[], load: () => void) {
  const { socket, current, reconnects } = useWorkspace();
  const workspaceId = current?.id;

  useEffect(() => {
    load();
  }, [load, workspaceId, reconnects]);

  const key = events.join(",");
  useEffect(() => {
    if (!socket) return;
    const names = key.split(",");
    const onEvent = () => load();
    names.forEach((name) => socket.on(name, onEvent));
    return () => {
      names.forEach((name) => socket.off(name, onEvent));
    };
  }, [socket, load, key]);
}
