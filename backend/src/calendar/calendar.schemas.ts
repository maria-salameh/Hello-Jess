import { z } from 'zod';
import { civilDate, fromBeforeTo, fromBeforeToIssue, timeZone } from '../common/schema-parts';

// The period to display (from and to are required) and the user's time zone.
export const calendarQuerySchema = z
  .object({ from: civilDate('from'), to: civilDate('to'), tz: timeZone.optional() })
  .refine(fromBeforeTo, fromBeforeToIssue);

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
