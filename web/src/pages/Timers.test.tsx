import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedTimer } from "../api";
import { FakeSocket } from "../test/fakeSocket";
import Timers from "./Timers";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), socket: null as unknown }));

vi.mock("../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../api")>()), api: mocks }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Ada", email: "ada@example.com" }, logout: vi.fn() }),
}));
vi.mock("../context/WorkspaceContext", () => ({
  useWorkspace: () => ({
    workspaces: [],
    current: { id: "w1", name: "Home", isPersonal: true, members: [] },
    switchTo: vi.fn(),
    socket: mocks.socket,
    connected: true,
    reconnects: 0,
  }),
}));

const NOW = new Date("2026-10-05T10:00:00.000Z");

const timer = (overrides: Partial<SharedTimer> = {}): SharedTimer => ({
  id: "tm1",
  workspaceId: "w1",
  label: "Focus",
  durationMs: 1_500_000,
  remainingMs: 1_500_000,
  status: "idle",
  startedAt: null,
  serverTime: NOW.toISOString(),
  ...overrides,
});

let socket: FakeSocket;

const renderTimers = () =>
  render(
    <MemoryRouter>
      <Timers />
    </MemoryRouter>,
  );

describe("Timers page", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"], now: NOW });
    socket = new FakeSocket();
    mocks.socket = socket;
    mocks.get.mockReset();
    mocks.get.mockResolvedValue({ data: [timer()] });
    mocks.post.mockReset();
    mocks.delete.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("lists the timers with the full duration while idle", async () => {
    renderTimers();
    expect(await screen.findByText("Focus")).toBeInTheDocument();
    expect(screen.getByLabelText("Focus time left")).toHaveTextContent("25:00");
  });

  it("starting a timer sends the action and then counts down on screen", async () => {
    mocks.post.mockResolvedValue({
      data: timer({ status: "running", startedAt: NOW.toISOString(), serverTime: NOW.toISOString() }),
    });
    renderTimers();
    await screen.findByText("Focus");

    await act(async () => screen.getByRole("button", { name: "Start" }).click());
    expect(mocks.post).toHaveBeenCalledWith("/timers/tm1/action", { action: "start" });
    expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByLabelText("Focus time left")).toHaveTextContent("24:00");
  });

  it("shows a timer started on another device, using the server clock to stay accurate", async () => {
    renderTimers();
    await screen.findByText("Focus");

    // Started 30 s ago according to the server, whatever this device's clock says.
    const startedAt = new Date(NOW.getTime() - 30_000).toISOString();
    await act(async () => socket.receive("timer:updated", timer({ status: "running", startedAt, serverTime: NOW.toISOString() })));

    expect(screen.getByLabelText("Focus time left")).toHaveTextContent("24:30");
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("adds timers created elsewhere and removes deleted ones", async () => {
    renderTimers();
    await screen.findByText("Focus");

    await act(async () => socket.receive("timer:created", timer({ id: "tm2", label: "Break", durationMs: 300_000, remainingMs: 300_000 })));
    expect(screen.getByLabelText("Break time left")).toHaveTextContent("05:00");

    await act(async () => socket.receive("timer:deleted", { id: "tm1" }));
    await waitFor(() => expect(screen.queryByText("Focus")).not.toBeInTheDocument());
  });

  it("creates a timer from minutes", async () => {
    mocks.post.mockResolvedValue({ data: timer({ id: "tm3", label: "Tea", durationMs: 180_000, remainingMs: 180_000 }) });
    renderTimers();
    await screen.findByText("Focus");

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("Label"), "Tea");
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "3");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mocks.post).toHaveBeenCalledWith("/timers", { label: "Tea", durationSeconds: 180 });
    expect(await screen.findByLabelText("Tea time left")).toHaveTextContent("03:00");
  });
});
