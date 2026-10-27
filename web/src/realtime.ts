// The WebSocket client. It authenticates with the same JWT as the HTTP API.
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

export function createSocket(token: string): Socket {
  const options = { auth: { token }, transports: ["websocket", "polling"] };
  // An empty API_URL means "same origin", which socket.io expresses by passing no URL.
  return API_URL ? io(API_URL, options) : io(options);
}
