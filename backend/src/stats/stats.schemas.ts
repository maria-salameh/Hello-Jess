import { z } from 'zod';
import { civilDate, fromBeforeTo, fromBeforeToIssue, timeZone } from '../common/schema-parts';

// Heatmap: optional period (default the last 52 weeks) and the user's time zone.
export const heatmapQuerySchema = z
  .object({ from: civilDate('from').optional(), to: civilDate('to').optional(), tz: timeZone.optional() })
  .refine(fromBeforeTo, fromBeforeToIssue);

// Completion rate: period (week or month), number of periods to return and time zone.
export const completionQuerySchema = z.object({
  period: z.enum(['week', 'month'], { error: 'period must be week or month' }).optional(),
  count: z.coerce
    .number({ error: 'count must be a number' })
    .int('count must be a whole number')
    .min(1, 'count must be at least 1')
    .max(52, 'count must be at most 52')
    .optional(),
  tz: timeZone.optional(),
});

export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
export type CompletionQuery = z.infer<typeof completionQuerySchema>;
