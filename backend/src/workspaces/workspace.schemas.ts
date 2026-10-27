import { z } from 'zod';

export const workspaceCreateSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a string' })
    .trim()
    .min(1, 'name must not be empty')
    .max(100, 'name must be at most 100 characters'),
});

export const memberAddSchema = z.object({
  email: z.string({ error: 'email is required and must be a string' }).trim().email('email must be a valid email address'),
});
