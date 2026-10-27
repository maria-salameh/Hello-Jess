import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string(),
});

// Plain strings only, which also blocks injection attempts through objects.
export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

// Name and/or email, both optional; only those sent change. Other fields are ignored,
// so the password or the id cannot be changed through this route.
export const profileUpdateSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a string' })
    .trim()
    .min(1, 'name must not be empty')
    .max(100, 'name must be at most 100 characters')
    .optional(),
  email: z.string({ error: 'email must be a string' }).trim().email('email must be a valid email address').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
