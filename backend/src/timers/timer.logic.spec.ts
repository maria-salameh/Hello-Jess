import { type TimerState, applyTimerAction, remainingAt } from './timer.logic';

const at = (iso: string) => new Date(iso);
const idle: TimerState = { status: 'idle', durationMs: 60_000, remainingMs: 60_000, startedAt: null };

describe('remainingAt', () => {
  it('returns the stored remaining time when the timer is not running', () => {
    expect(remainingAt(idle, at('2026-10-05T10:00:00Z'))).toBe(60_000);
    expect(remainingAt({ ...idle, status: 'paused', remainingMs: 12_000 }, at('2026-10-05T10:00:00Z'))).toBe(12_000);
  });

  it('counts down from startedAt while running, and never goes below zero', () => {
    const running = applyTimerAction(idle, 'start', at('2026-10-05T10:00:00Z'));
    expect(remainingAt(running, at('2026-10-05T10:00:20Z'))).toBe(40_000);
    expect(remainingAt(running, at('2026-10-05T10:05:00Z'))).toBe(0);
  });
});

describe('applyTimerAction', () => {
  it('start puts an idle timer in the running state', () => {
    const state = applyTimerAction(idle, 'start', at('2026-10-05T10:00:00Z'));
    expect(state).toMatchObject({ status: 'running', remainingMs: 60_000, startedAt: at('2026-10-05T10:00:00Z') });
  });

  it('pause keeps what was left, and start resumes from there', () => {
    const running = applyTimerAction(idle, 'start', at('2026-10-05T10:00:00Z'));
    const paused = applyTimerAction(running, 'pause', at('2026-10-05T10:00:15Z'));
    expect(paused).toMatchObject({ status: 'paused', remainingMs: 45_000, startedAt: null });

    const resumed = applyTimerAction(paused, 'start', at('2026-10-05T10:10:00Z'));
    expect(remainingAt(resumed, at('2026-10-05T10:10:05Z'))).toBe(40_000);
  });

  it('reset goes back to the full duration', () => {
    const running = applyTimerAction(idle, 'start', at('2026-10-05T10:00:00Z'));
    expect(applyTimerAction(running, 'reset', at('2026-10-05T10:00:30Z'))).toEqual(idle);
  });

  it('starting a finished timer restarts it from the full duration', () => {
    const finished: TimerState = { status: 'paused', durationMs: 60_000, remainingMs: 0, startedAt: null };
    expect(applyTimerAction(finished, 'start', at('2026-10-05T10:00:00Z')).remainingMs).toBe(60_000);
  });

  it('ignores impossible transitions, so two devices clicking at once do no harm', () => {
    const running = applyTimerAction(idle, 'start', at('2026-10-05T10:00:00Z'));
    expect(applyTimerAction(running, 'start', at('2026-10-05T10:00:10Z'))).toBe(running);
    expect(applyTimerAction(idle, 'pause', at('2026-10-05T10:00:10Z'))).toBe(idle);
  });
});
