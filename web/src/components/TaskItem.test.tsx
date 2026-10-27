import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "../api";
import TaskItem from "./TaskItem";

const task: Task = {
  id: "t1",
  workspaceId: "w1",
  createdById: "u1",
  title: "Write report",
  status: "todo",
  description: "Quarterly numbers",
  dueDate: null,
  priority: "high",
  completedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
};

function setup(overrides: Partial<Task> = {}) {
  const onStatusChange = vi.fn();
  const onDelete = vi.fn();
  const view = { ...task, ...overrides };
  render(
    <MemoryRouter>
      <TaskItem task={view} onStatusChange={onStatusChange} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return { onStatusChange, onDelete, view };
}

describe("TaskItem", () => {
  it("shows the title as a link to the detail page, with description and priority", () => {
    setup();
    expect(screen.getByRole("link", { name: "Write report" })).toHaveAttribute("href", "/tasks/t1");
    expect(screen.getByText("Quarterly numbers")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("the checkbox completes an open task", async () => {
    const open = setup();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(open.onStatusChange).toHaveBeenCalledWith(open.view, "done");
  });

  it("the checkbox reopens a done task", async () => {
    const done = setup({ status: "done" });
    expect(screen.getByRole("checkbox")).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(done.onStatusChange).toHaveBeenCalledWith(done.view, "todo");
  });

  it("the status menu and delete button call back", async () => {
    const { onStatusChange, onDelete, view } = setup();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "doing");
    expect(onStatusChange).toHaveBeenCalledWith(view, "doing");
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    expect(onDelete).toHaveBeenCalledWith(view);
  });

  it("flags an open task whose due date has passed", () => {
    setup({ dueDate: "2020-01-01" });
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it("does not flag a finished task as overdue", () => {
    setup({ dueDate: "2020-01-01", status: "done" });
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });
});
