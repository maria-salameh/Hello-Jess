import { useEffect, useRef } from "react";
import { useWorkspace } from "../context/WorkspaceContext";

// Relance `load` quand les données ont pu changer : un autre appareil ou un autre membre a envoyé l'un des
// `events`, l'utilisateur a changé d'espace de travail, ou le socket s'est reconnecté après une coupure.
// Le premier chargement reste à la charge de l'écran. `load` doit rester identique d'un rendu à l'autre
// (l'envelopper dans useCallback) pour ne se relancer que pour une vraie raison.
export function useLiveReload(events: readonly string[], load: () => void) {
  const { socket, current, reconnects } = useWorkspace();
  const workspaceId = current?.id;

  // Ne rien faire au premier rendu, ni quand l'espace de travail vient seulement d'être trouvé au démarrage.
  const seen = useRef<{ workspaceId?: string; reconnects: number }>({ workspaceId, reconnects });
  useEffect(() => {
    const before = seen.current;
    seen.current = { workspaceId, reconnects };
    if (before.workspaceId !== undefined && before.workspaceId !== workspaceId) load();
    else if (before.reconnects !== reconnects) load();
  }, [load, workspaceId, reconnects]);

  const key = events.join(",");
  useEffect(() => {
    if (!socket || !key) return;
    const names = key.split(",");
    const onEvent = () => load();
    names.forEach((name) => socket.on(name, onEvent));
    return () => {
      names.forEach((name) => socket.off(name, onEvent));
    };
  }, [socket, load, key]);
}
