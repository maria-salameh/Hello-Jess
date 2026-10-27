import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeSocket } from "../test/fakeSocket";
import { useLiveRefresh } from "./useLiveRefresh";

const state = vi.hoisted(() => ({
  socket: null as unknown,
  current: { id: "w1" } as { id: string } | null,
  reconnects: 0,
}));

vi.mock("../context/WorkspaceContext", () => ({ useWorkspace: () => state }));

const EVENTS = ["task:created", "task:deleted"];

describe("useLiveRefresh", () => {
  let socket: FakeSocket;

  beforeEach(() => {
    socket = new FakeSocket();
    state.socket = socket;
    state.current = { id: "w1" };
    state.reconnects = 0;
  });

  it("loads once when the page opens", () => {
    const load = vi.fn();
    renderHook(() => useLiveRefresh(EVENTS, load));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads when the server pushes one of the events, and ignores others", () => {
    const load = vi.fn();
    renderHook(() => useLiveRefresh(EVENTS, load));
    act(() => socket.receive("task:created"));
    act(() => socket.receive("task:deleted"));
    expect(load).toHaveBeenCalledTimes(3);
    act(() => socket.receive("note:updated"));
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("reloads after the user switches workspace and after a reconnection", () => {
    const load = vi.fn();
    const { rerender } = renderHook(() => useLiveRefresh(EVENTS, load));

    state.current = { id: "w2" };
    rerender();
    expect(load).toHaveBeenCalledTimes(2);

    state.reconnects = 1;
    rerender();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("stops listening when the page closes", () => {
    const load = vi.fn();
    const { unmount } = renderHook(() => useLiveRefresh(EVENTS, load));
    expect(socket.listenerCount("task:created")).toBe(1);
    unmount();
    expect(socket.listenerCount("task:created")).toBe(0);
    expect(socket.listenerCount("task:deleted")).toBe(0);
  });

  it("works without a socket (still loads once)", () => {
    state.socket = null;
    const load = vi.fn();
    renderHook(() => useLiveRefresh(EVENTS, load));
    expect(load).toHaveBeenCalledTimes(1);
  });
});
