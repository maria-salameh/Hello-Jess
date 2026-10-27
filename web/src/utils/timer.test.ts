import { describe, expect, it } from "vitest";
import { clockOffset, formatDuration, remainingMs } from "./timer";

describe("remainingMs", () => {
  const base = { remainingMs: 60_000, startedAt: "2026-10-05T10:00:00.000Z" };
  const at = (iso: string) => new Date(iso).getTime();

  it("returns the stored time when the timer is not running", () => {
    expect(remainingMs({ ...base, status: "idle", startedAt: null }, at("2026-10-05T10:30:00Z"))).toBe(60_000);
    expect(remainingMs({ ...base, status: "paused", startedAt: null, remainingMs: 7_000 }, at("2026-10-05T10:30:00Z"))).toBe(7_000);
  });

  it("counts down while running and stops at zero", () => {
    expect(remainingMs({ ...base, status: "running" }, at("2026-10-05T10:00:15Z"))).toBe(45_000);
    expect(remainingMs({ ...base, status: "running" }, at("2026-10-05T11:00:00Z"))).toBe(0);
  });

  it("corrects for a device clock that is wrong", () => {
    // The device clock is 10 s behind the server: without the offset the timer would show 10 s too much.
    const offset = clockOffset("2026-10-05T10:00:20.000Z", at("2026-10-05T10:00:10Z"));
    expect(offset).toBe(10_000);
    expect(remainingMs({ ...base, status: "running" }, at("2026-10-05T10:00:10Z"), offset)).toBe(40_000);
  });
});

describe("formatDuration", () => {
  it("formats minutes and seconds, adding hours only when needed", () => {
    expect(formatDuration(25 * 60_000)).toBe("25:00");
    expect(formatDuration(65_000)).toBe("01:05");
    expect(formatDuration(3_725_000)).toBe("01:02:05");
    expect(formatDuration(0)).toBe("00:00");
  });

  it("rounds up, so the display never shows 00:00 while time is left", () => {
    expect(formatDuration(400)).toBe("00:01");
    expect(formatDuration(-5)).toBe("00:00");
  });
});
