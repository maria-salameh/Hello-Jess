// Time left on a shared timer. The server only stores the state and when it last changed; each device
// computes the countdown itself, so nothing is pushed every second.
import type { SharedTimer } from "../api";

// Difference between the server clock and this device's clock, measured when the timer was received.
export function clockOffset(serverTime: string, now: number = Date.now()): number {
  return new Date(serverTime).getTime() - now;
}

// Milliseconds left at `now` (a device timestamp), given the clock offset of the device.
export function remainingMs(timer: Pick<SharedTimer, "status" | "remainingMs" | "startedAt">, now: number, offset = 0): number {
  if (timer.status !== "running" || !timer.startedAt) return timer.remainingMs;
  const elapsed = now + offset - new Date(timer.startedAt).getTime();
  return Math.max(0, timer.remainingMs - elapsed);
}

// "25:00", "01:05:09". Rounds up so the display shows 00:01 until the very end.
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
