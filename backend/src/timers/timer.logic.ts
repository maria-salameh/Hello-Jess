// A shared countdown timer. The server stores only the state and the instants it changed;
// every device computes the remaining time itself, so nothing needs to be pushed every second.
//
// - idle    : not started (or reset), `remainingMs` is the full duration
// - running : counts down from `startedAt`; it ends at startedAt + remainingMs
// - paused  : `remainingMs` is what was left when it was paused
export type TimerStatus = 'idle' | 'running' | 'paused';
export type TimerAction = 'start' | 'pause' | 'reset';

export type TimerState = {
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  startedAt: Date | null;
};

// Milliseconds left at `now`.
export function remainingAt(timer: TimerState, now: Date): number {
  if (timer.status !== 'running' || !timer.startedAt) return timer.remainingMs;
  return Math.max(0, timer.remainingMs - (now.getTime() - timer.startedAt.getTime()));
}

// The state after an action. Invalid transitions (pausing a timer that is not running, starting one
// that is already running or has finished) leave the state unchanged, so repeated clicks from two devices are harmless.
export function applyTimerAction(timer: TimerState, action: TimerAction, now: Date): TimerState {
  switch (action) {
    case 'start': {
      if (timer.status === 'running') return timer;
      // Starting a finished timer restarts it from the full duration.
      const remainingMs = timer.remainingMs > 0 ? timer.remainingMs : timer.durationMs;
      return { ...timer, status: 'running', remainingMs, startedAt: now };
    }
    case 'pause': {
      if (timer.status !== 'running') return timer;
      return { ...timer, status: 'paused', remainingMs: remainingAt(timer, now), startedAt: null };
    }
    case 'reset':
      return { ...timer, status: 'idle', remainingMs: timer.durationMs, startedAt: null };
  }
}
