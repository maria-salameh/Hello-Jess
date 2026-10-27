import { z } from 'zod';
import { requiredText } from '../common/schema-parts';

const MAX_DURATION_SECONDS = 24 * 60 * 60;

export const timerCreateSchema = z.object({
  label: requiredText('label', 100),
  durationSeconds: z
    .number({ error: 'durationSeconds is required and must be a number' })
    .int('durationSeconds must be a whole number')
    .min(1, 'durationSeconds must be at least 1')
    .max(MAX_DURATION_SECONDS, 'durationSeconds must be at most 86400 (24 hours)'),
});

export const timerActionSchema = z.object({
  action: z.enum(['start', 'pause', 'reset'], { error: 'action must be one of: start, pause, reset' }),
});

export type TimerCreateInput = z.infer<typeof timerCreateSchema>;
