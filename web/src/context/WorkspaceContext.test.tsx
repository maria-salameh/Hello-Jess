import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "../api";
import { FakeSocket } from "../test/fakeSocket";
import { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";

const mocks = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  get: vi.fn(),
  sockets: [] as unknown[],
}));

vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  api: { get: mocks.get },
}));
vi.mock("../realtime", () => ({
  createSocket: () => {
    const socket = new FakeSocket();
    mocks.sockets.push(socket);
    return socket;
  },
}));

const workspace = (id: string, isPersonal: boolean): Workspace => ({
  id,
  name: id,
  ownerId: "u1",
  isPersonal,
  members: [],
});

function Probe() {
  const { current, workspaces, connected, reconnects, switchTo } = useWorkspace();
  return (
    <div>
      <span data-testid="current">{current?.id ?? "none"}</span>
      <span data-testid="count">{workspaces.length}</span>
      <span data-testid="connected">{String(connected)}</span>
      <span data-testid="reconnects">{reconnects}</span>
      <button onClick={() => switchTo("team")}>switch</button>
    </div>
  );
}

const lastSocket = () => mocks.sockets[mocks.sockets.length - 1] as FakeSocket;

describe("WorkspaceProvider", () => {
  beforeEach(() => {
    mocks.user = { id: "u1" };
    mocks.sockets.length = 0;
    mocks.get.mockReset();
    mocks.get.mockResolvedValue({ data: [workspace("team", false), workspace("home", true)] });
  });

  it("loads the workspaces and defaults to the personal one", async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(screen.getByTestId("current")).toHaveTextContent("home"));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(localStorage.getItem("hellojess_workspace")).toBe("home");
  });

  it("keeps the workspace remembered from the last visit, and lets the user switch", async () => {
    localStorage.setItem("hellojess_workspace", "team");
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(screen.getByTestId("current")).toHaveTextContent("team"));

    mocks.get.mockResolvedValue({ data: [workspace("home", true), workspace("other", false)] });
    await act(async () => lastSocket().receive("workspace:removed", { id: "team" }));
    // The remembered workspace is gone: back to the personal one.
    await waitFor(() => expect(screen.getByTestId("current")).toHaveTextContent("home"));
  });

  it("refreshes when someone adds the user to a workspace", async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    await act(async () => lastSocket().receive("workspace:updated", { id: "team" }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  });

  it("tracks the connection and counts reconnections, but not the first connect", async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(mocks.sockets).toHaveLength(1));

    act(() => lastSocket().receive("connect"));
    expect(screen.getByTestId("connected")).toHaveTextContent("true");
    expect(screen.getByTestId("reconnects")).toHaveTextContent("0");

    act(() => lastSocket().receive("disconnect"));
    expect(screen.getByTestId("connected")).toHaveTextContent("false");
    act(() => lastSocket().receive("connect"));
    expect(screen.getByTestId("reconnects")).toHaveTextContent("1");
  });

  it("closes the socket when the user logs out, and opens none without a user", async () => {
    const { rerender } = render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await waitFor(() => expect(mocks.sockets).toHaveLength(1));
    const socket = lastSocket();

    mocks.user = null;
    rerender(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(socket.closed).toBe(true);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(mocks.sockets).toHaveLength(1);
  });
});
