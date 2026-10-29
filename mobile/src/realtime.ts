// Le client WebSocket. Il s'authentifie avec le même jeton que l'API HTTP, et reçoit en direct les changements
// faits depuis les autres appareils et par les autres membres.
import { io, type Socket } from "socket.io-client";

export function createSocket(token: string): Socket {
  return io(process.env.EXPO_PUBLIC_API_URL, { auth: { token }, transports: ["websocket", "polling"] });
}
