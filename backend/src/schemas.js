import { z } from "zod";

const priority = z.enum(["low", "medium", "high"]);

const datetime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid datetime")
  .transform((s) => new Date(s));

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const taskCreateSchema = z.object({
  title: z.string(),
  notes: z.string().nullable().optional(),
  due_date: datetime.nullable().optional(),
  priority: priority.default("medium"),
});

export const taskUpdateSchema = z.object({
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  due_date: datetime.nullable().optional(),
  priority: priority.optional(),
  completed: z.boolean().optional(),
});

export const taskListQuerySchema = z.object({
  completed: z.enum(["true", "false"]).optional(),
});
