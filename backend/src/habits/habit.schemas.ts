import { z } from 'zod';
import { addDays } from '../common/dates';
import { civilDate, fromBeforeTo, fromBeforeToIssue, optionalText, requiredText } from '../common/schema-parts';

export const habitCreateSchema = z.object({
  name: requiredText('name', 100),
  description: optionalText('description', 500).optional(),
});

export const habitUpdateSchema = z.object({
  name: requiredText('name', 100).optional(),
  description: optionalText('description', 500).optional(),
});

// Optional from/to period for habit lists and events.
export const habitRangeQuerySchema = z
  .object({ from: civilDate('from').optional(), to: civilDate('to').optional() })
  .refine(fromBeforeTo, fromBeforeToIssue);

// Record that a habit was done on a day. The server does not know the user's time zone, so it only
// refuses dates more than one day in the future (in UTC).
export const habitEventCreateSchema = z.object({
  date: civilDate('date').refine(
    (date) => date <= addDays(new Date().toISOString().slice(0, 10), 1),
    'date must not be in the future',
  ),
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
export type HabitRangeQuery = z.infer<typeof habitRangeQuerySchema>;
