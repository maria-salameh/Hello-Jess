// The tasks page showing live changes: another device or member adds a task and it appears without a refresh.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../api";
import { FakeSocket } from "../test/fakeSocket";
import Tasks from "./Tasks";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), socket: null as unknown }));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  api: mocks,
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Ada", email: "ada@example.com" }, logout: vi.fn() }),
}));
vi.mock("../context/WorkspaceContext", () => ({
  useWorkspace: () => ({
    workspaces: [{ id: "w1", name: "Home", isPersonal: true, members: [] }],
    current: { id: "w1", name: "Home", isPersonal: true, members: [] },
    switchTo: vi.fn(),
    socket: mocks.socket,
    connected: true,
    reconnects: 0,
  }),
}));

const task = (id: string, title: string, status: Task["status"] = "todo"): Task => ({
  id,
  workspaceId: "w1",
  createdById: "u1",
  title,
  status,
  description: "",
  dueDate: null,
  priority: "medium",
  completedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
});

let server: Task[];
let socket: FakeSocket;

const countsOf = (tasks: Task[]) => ({
  total: tasks.length,
  todo: tasks.filter((t) => t.status === "todo").length,
  doing: tasks.filter((t) => t.status === "doing").length,
  done: tasks.filter((t) => t.status === "done").length,
});

function renderTasks() {
  return render(
    <MemoryRouter>
      <Tasks />
    </MemoryRouter>,
  );
}

describe("Tasks page", () => {
  beforeEach(() => {
    server = [task("t1", "Buy milk")];
    socket = new FakeSocket();
    mocks.socket = socket;
    mocks.get.mockReset();
    mocks.get.mockImplementation(async (url: string) => ({ data: url === "/tasks/count" ? countsOf(server) : [...server] }));
    mocks.post.mockReset();
    mocks.post.mockImplementation(async (_url: string, body: { title: string }) => {
      server = [...server, task("t-new", body.title)];
      return { data: server[server.length - 1] };
    });
  });

  it("lists the tasks of the workspace with the counter in the header", async () => {
    renderTasks();
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("1 open · 0 done")).toBeInTheDocument();
  });

  it("shows a task added on another device as soon as the server pushes the event", async () => {
    renderTasks();
    await screen.findByText("Buy milk");

    server = [...server, task("t2", "Written on the phone")];
    await act(async () => socket.receive("task:created", server[1]));

    expect(await screen.findByText("Written on the phone")).toBeInTheDocument();
    expect(screen.getByText("2 open · 0 done")).toBeInTheDocument();
  });

  it("drops a task deleted elsewhere and shows the empty state", async () => {
    renderTasks();
    await screen.findByText("Buy milk");

    server = [];
    await act(async () => socket.receive("task:deleted", { id: "t1" }));

    await waitFor(() => expect(screen.queryByText("Buy milk")).not.toBeInTheDocument());
    expect(screen.getByText(/No tasks yet/)).toBeInTheDocument();
  });

  it("adds a task through the form and clears it", async () => {
    renderTasks();
    await screen.findByText("Buy milk");

    await userEvent.type(screen.getByLabelText("Title"), "Call the bank");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(mocks.post).toHaveBeenCalledWith("/tasks", expect.objectContaining({ title: "Call the bank", status: "todo", priority: "medium" }));
    expect(await screen.findByText("Call the bank")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("shows the validation messages of the server above the form", async () => {
    mocks.post.mockRejectedValue(
      Object.assign(new Error("422"), {
        isAxiosError: true,
        response: { status: 422, data: { errors: [{ field: "title", message: "title must not be empty" }] } },
      }),
    );
    renderTasks();
    await screen.findByText("Buy milk");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("title must not be empty")).toBeInTheDocument();
  });

  it("asks the server for filtered tasks when a filter is chosen", async () => {
    renderTasks();
    await screen.findByText("Buy milk");
    await userEvent.selectOptions(screen.getByLabelText("Filter by priority"), "high");
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/tasks", { params: { priority: "high" } }));
  });
});
