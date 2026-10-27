import { NotFoundException } from '@nestjs/common';
import type { Task } from './task.entity';
import { TasksService, byStatusThenDueDate } from './tasks.service';

type Row = Pick<Task, 'status' | 'dueDate'>;
const row = (status: Row['status'], dueDate: string | null): Row => ({ status, dueDate });

describe('byStatusThenDueDate', () => {
  it('puts open tasks first, then sorts by due date with undated tasks last', () => {
    const sorted = [row('done', '2026-01-01'), row('todo', null), row('doing', '2026-03-01'), row('todo', '2026-02-01')].sort(
      byStatusThenDueDate,
    );
    expect(sorted).toEqual([row('todo', '2026-02-01'), row('doing', '2026-03-01'), row('todo', null), row('done', '2026-01-01')]);
  });

  it('keeps creation order on ties (the sort is stable)', () => {
    const a = { ...row('todo', null), n: 1 };
    const b = { ...row('todo', null), n: 2 };
    expect([b, a].sort(byStatusThenDueDate)).toEqual([b, a]);
  });
});

describe('TasksService', () => {
  const workspaceId = 'ws-1';
  const build = (found: Partial<Task> | null) => {
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (task) => task),
      findOneBy: jest.fn().mockResolvedValue(found),
      delete: jest.fn().mockResolvedValue({ affected: found ? 1 : 0 }),
    };
    const realtime = { emitToWorkspace: jest.fn() };
    return { service: new TasksService(repo as never, realtime as never), repo, realtime };
  };

  it('creating a task as "done" completes it now; otherwise completedAt stays null', async () => {
    const { service } = build(null);
    const done = await service.create(workspaceId, 'u1', { title: 'x', status: 'done', priority: 'medium' });
    const todo = await service.create(workspaceId, 'u1', { title: 'y', status: 'todo', priority: 'medium' });
    expect(done.completedAt).toBeInstanceOf(Date);
    expect(todo.completedAt).toBeNull();
  });

  it('completedAt follows the status: set on done, kept while it stays done, cleared on reopen', async () => {
    const { service } = build({ id: 't', status: 'todo', completedAt: null });
    const finished = await service.update(workspaceId, 't', { status: 'done' });
    expect(finished.completedAt).toBeInstanceOf(Date);

    const original = finished.completedAt;
    const unchanged = await service.update(workspaceId, 't', { status: 'done', title: 'renamed' });
    expect(unchanged.completedAt).toBe(original);

    const reopened = await service.update(workspaceId, 't', { status: 'doing' });
    expect(reopened.completedAt).toBeNull();
  });

  it('broadcasts every change to the workspace room', async () => {
    const { service, realtime } = build({ id: 't', status: 'todo', completedAt: null });
    await service.create(workspaceId, 'u1', { title: 'x', status: 'todo', priority: 'low' });
    await service.update(workspaceId, 't', { title: 'z' });
    await service.remove(workspaceId, 't');
    expect(realtime.emitToWorkspace.mock.calls.map((call) => call[1])).toEqual(['task:created', 'task:updated', 'task:deleted']);
    expect(realtime.emitToWorkspace).toHaveBeenCalledWith(workspaceId, 'task:deleted', { id: 't' });
  });

  it('a task of another workspace is a 404 and nothing is broadcast', async () => {
    const { service, realtime } = build(null);
    await expect(service.update(workspaceId, 't', { title: 'z' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(workspaceId, 't')).rejects.toBeInstanceOf(NotFoundException);
    expect(realtime.emitToWorkspace).not.toHaveBeenCalled();
  });
});
