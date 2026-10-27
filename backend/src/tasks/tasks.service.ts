import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { Task } from './task.entity';
import { STATUSES, type TaskCreateInput, type TaskListQuery, type TaskUpdateInput } from './task.schemas';

// Open tasks first (done ones last), then by due date (no due date last); ties keep creation order.
export function byStatusThenDueDate(a: Pick<Task, 'status' | 'dueDate'>, b: Pick<Task, 'status' | 'dueDate'>) {
  const doneA = a.status === 'done';
  const doneB = b.status === 'done';
  if (doneA !== doneB) return doneA ? 1 : -1;
  if (Boolean(a.dueDate) !== Boolean(b.dueDate)) return a.dueDate ? -1 : 1;
  // "YYYY-MM-DD" dates compare correctly as plain text.
  return a.dueDate && b.dueDate ? a.dueDate.localeCompare(b.dueDate) : 0;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly realtime: RealtimeService,
  ) {}

  async list(workspaceId: string, { status, priority, dueFrom, dueTo, noDueDate }: TaskListQuery) {
    const where: FindOptionsWhere<Task> = { workspaceId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (noDueDate === 'true') where.dueDate = IsNull();
    else if (dueFrom && dueTo) where.dueDate = Between(dueFrom, dueTo);
    else if (dueFrom) where.dueDate = MoreThanOrEqual(dueFrom);
    else if (dueTo) where.dueDate = LessThanOrEqual(dueTo);

    // Fetched in creation order first, so the sort below keeps that order on ties.
    const tasks = await this.tasks.find({ where, order: { createdAt: 'ASC', id: 'ASC' } });
    return tasks.sort(byStatusThenDueDate);
  }

  // The task counter: the total and the number of tasks per status.
  async count(workspaceId: string) {
    const counts = await Promise.all(STATUSES.map((status) => this.tasks.countBy({ workspaceId, status })));
    return {
      total: counts.reduce((sum, n) => sum + n, 0),
      ...Object.fromEntries(STATUSES.map((status, i) => [status, counts[i]])),
    };
  }

  async get(workspaceId: string, id: string) {
    const task = await this.tasks.findOneBy({ id, workspaceId });
    if (!task) throw new NotFoundException({ detail: 'Task not found' });
    return task;
  }

  async create(workspaceId: string, userId: string, data: TaskCreateInput) {
    const task = await this.tasks.save(
      this.tasks.create({
        ...data,
        description: data.description ?? '',
        dueDate: data.dueDate ?? null,
        workspaceId,
        createdById: userId,
        // A task created directly as "done" is finished right now.
        completedAt: data.status === 'done' ? new Date() : null,
      }),
    );
    this.realtime.emitToWorkspace(workspaceId, 'task:created', task);
    return task;
  }

  async update(workspaceId: string, id: string, changes: TaskUpdateInput) {
    const task = await this.get(workspaceId, id);
    const wasDone = task.status === 'done';
    Object.assign(task, changes);

    // Keep completedAt consistent with the status: set when it becomes "done", cleared when it is reopened.
    if (changes.status !== undefined) {
      if (task.status === 'done' && !wasDone) task.completedAt = new Date();
      if (task.status !== 'done') task.completedAt = null;
    }

    const saved = await this.tasks.save(task);
    this.realtime.emitToWorkspace(workspaceId, 'task:updated', saved);
    return saved;
  }

  async remove(workspaceId: string, id: string) {
    const result = await this.tasks.delete({ id, workspaceId });
    if (!result.affected) throw new NotFoundException({ detail: 'Task not found' });
    this.realtime.emitToWorkspace(workspaceId, 'task:deleted', { id });
  }
}
