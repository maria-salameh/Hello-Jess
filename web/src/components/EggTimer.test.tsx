import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EggTimer, { formatClock } from "./EggTimer";

describe("formatClock", () => {
  it("shows minutes and zero-padded seconds, rounding up", () => {
    expect(formatClock(6 * 60_000)).toBe("6:00");
    expect(formatClock(59_100)).toBe("1:00");
    expect(formatClock(0)).toBe("0:00");
  });
});

describe("EggTimer", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"], now: new Date("2026-01-01T10:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it("offers soft, medium and hard eggs with their times", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EggTimer />);
    await user.click(screen.getByRole("button", { name: "Egg timer" }));
    expect(screen.getByText("6 min")).toBeInTheDocument();
    expect(screen.getByText("8 min")).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
  });

  it("counts down after choosing a cooking and announces when the egg is ready", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EggTimer />);
    await user.click(screen.getByRole("button", { name: "Egg timer" }));
    await user.click(screen.getByRole("button", { name: /Soft/ }));
    expect(screen.getByLabelText("Egg timer, 6:00 left")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByLabelText("Egg timer, 5:00 left")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5 * 60_000));
    expect(screen.getByText("Your egg is ready!")).toBeInTheDocument();
  });

  it("pauses and resumes without losing time", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EggTimer />);
    await user.click(screen.getByRole("button", { name: "Egg timer" }));
    await user.click(screen.getByRole("button", { name: /Hard/ }));
    act(() => vi.advanceTimersByTime(30_000));
    await user.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(120_000));
    expect(screen.getByLabelText("Egg timer, 9:30 left")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByLabelText("Egg timer, 9:00 left")).toBeInTheDocument();
  });
});
