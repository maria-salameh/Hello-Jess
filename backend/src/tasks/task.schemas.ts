import { z } from 'zod';
import { civilDate, optionalText, requiredText } from '../common/schema-parts';

export const STATUSES = ['todo', 'doing', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];

const priority = z.enum(PRIORITIES, { error: 'priority must be one of: low, medium, high' });

// Creation: title and status are required; priority defaults to "medium".
export const taskCreateSchema = z.object({
  title: requiredText('title', 120),
  status: z.enum(STATUSES, { error: 'status is required and must be one of: todo, doing, done' }),
  description: optionalText('description', 1000).optional(),
  dueDate: civilDate('dueDate').nullable().optional(),
  priority: priority.default('medium'),
});

// Update: every field is optional, only those sent change (dueDate: null clears the due date).
export const taskUpdateSchema = z.object({
  title: requiredText('title', 120).optional(),
  status: z.enum(STATUSES, { error: 'status must be one of: todo, doing, done' }).optional(),
  description: optionalText('description', 1000).optional(),
  dueDate: civilDate('dueDate').nullable().optional(),
  priority: priority.optional(),
});

// Filters of GET /api/tasks: by status, priority and due date.
export const taskListQuerySchema = z
  .object({
    status: z.enum(STATUSES, { error: 'status must be one of: todo, doing, done' }).optional(),
    priority: priority.optional(),
    dueFrom: civilDate('dueFrom').optional(),
    dueTo: civilDate('dueTo').optional(),
    noDueDate: z.enum(['true', 'false'], { error: 'noDueDate must be true or false' }).optional(),
  })
  .refine((q) => !(q.noDueDate === 'true' && (q.dueFrom || q.dueTo)), {
    error: 'noDueDate cannot be combined with dueFrom or dueTo',
    path: ['noDueDate'],
  })
  .refine((q) => !q.dueFrom || !q.dueTo || q.dueFrom <= q.dueTo, {
    error: 'dueFrom must not be after dueTo',
    path: ['dueFrom'],
  });

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
