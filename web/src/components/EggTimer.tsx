// A floating egg-shaped kitchen timer in the bottom-right corner. Pick how the egg should be cooked and it counts down;
// the egg fills up with yolk colour as the time passes, and rings when it is ready.
import { useEffect, useId, useState } from "react";
import "./EggTimer.css";

export const PRESETS = [
  { id: "soft", label: "Soft", detail: "Runny yolk", minutes: 6 },
  { id: "medium", label: "Medium", detail: "Jammy yolk", minutes: 8 },
  { id: "hard", label: "Hard", detail: "Firm yolk", minutes: 10 },
] as const;

type Preset = (typeof PRESETS)[number];

// "endAt" is the moment the egg is ready while running, and null while paused (then "left" holds the time remaining).
type Run = { preset: Preset; endAt: number | null; left: number };

const EGG_PATH = "M50 4 C75 4 94 52 94 82 C94 108 74 126 50 126 C26 126 6 108 6 82 C6 52 25 4 50 4 Z";

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Three short beeps. Browsers may refuse audio, in which case the animation alone announces the egg.
function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* no audio available */
  }
}

export default function EggTimer() {
  const clipId = useId();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const left = run ? (run.endAt !== null ? Math.max(0, run.endAt - now) : run.left) : 0;
  const done = run !== null && left === 0;
  const ticking = run !== null && run.endAt !== null && !done;
  const progress = run ? 1 - left / (run.preset.minutes * 60_000) : 0;

  // Redraws four times a second while counting down; the end time is absolute, so a background tab stays accurate.
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (done) beep();
  }, [done]);

  function start(preset: Preset) {
    const t = Date.now();
    setNow(t);
    setRun({ preset, endAt: t + preset.minutes * 60_000, left: preset.minutes * 60_000 });
  }

  function togglePause() {
    if (!run) return;
    const t = Date.now();
    setNow(t);
    setRun(run.endAt !== null ? { ...run, endAt: null, left } : { ...run, endAt: t + run.left });
  }

  const state = done ? "done" : ticking ? "cooking" : "";

  return (
    <div className="egg-timer">
      {open && (
        <div className="egg-panel" role="dialog" aria-label="Egg timer">
          <h2>Egg timer</h2>
          {run && (
            <div className={`egg-status ${state}`} aria-live="polite">
              <span className="egg-status-kind">{done ? "Your egg is ready!" : `${run.preset.label} egg`}</span>
              <strong>{formatClock(left)}</strong>
              <div className="egg-status-actions">
                {!done && (
                  <button type="button" onClick={togglePause}>
                    {run.endAt !== null ? "Pause" : "Resume"}
                  </button>
                )}
                <button type="button" onClick={() => setRun(null)}>
                  {done ? "Dismiss" : "Reset"}
                </button>
              </div>
            </div>
          )}
          <ul className="egg-presets">
            {PRESETS.map((preset) => (
              <li key={preset.id}>
                <button type="button" className={run?.preset.id === preset.id ? "active" : ""} onClick={() => start(preset)}>
                  <span className="egg-preset-name">{preset.label}</span>
                  <span className="egg-preset-detail">{preset.detail}</span>
                  <span className="egg-preset-time">{preset.minutes} min</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className={`egg-button ${state}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={run ? `Egg timer, ${formatClock(left)} left` : "Egg timer"}>
        <svg viewBox="0 0 100 130" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <path d={EGG_PATH} />
            </clipPath>
          </defs>
          <path d={EGG_PATH} className="egg-shell" />
          <g clipPath={`url(#${clipId})`}>
            <rect className="egg-fill" x="0" width="100" height="130" y={130 * (1 - progress)} />
          </g>
          <path d={EGG_PATH} className="egg-outline" />
          <path d="M28 40 C32 28 40 20 48 16" className="egg-shine" />
        </svg>
        <span className="egg-label">{run ? formatClock(left) : "Egg timer"}</span>
      </button>
    </div>
  );
}
