// Building blocks shared by the zod schemas.
import { z } from 'zod';
import { isValidCivilDate, isValidTimeZone } from './dates';

// Required text: leading/trailing spaces are removed, then it must be 1 to `max` characters.
export const requiredText = (field: string, max: number) =>
  z
    .string({ error: `${field} is required and must be a string` })
    .trim()
    .min(1, `${field} must not be empty`)
    .max(max, `${field} must be at most ${max} characters`);

// Optional text: 0 to `max` characters (the empty string is accepted).
export const optionalText = (field: string, max: number) =>
  z.string({ error: `${field} must be a string` }).max(max, `${field} must be at most ${max} characters`);

// A real calendar date in YYYY-MM-DD format ("2026-02-30" is refused).
export const civilDate = (field: string) =>
  z
    .string({ error: `${field} must be a string in YYYY-MM-DD format` })
    .refine(isValidCivilDate, `${field} must be a real calendar date in YYYY-MM-DD format`);

// A known IANA time zone, for example "Europe/Paris".
export const timeZone = z
  .string({ error: 'tz must be a string' })
  .refine(isValidTimeZone, 'tz must be a valid IANA time zone, for example Europe/Paris');

// Checks that a from/to range runs the right way (when both are given).
export const fromBeforeTo = (q: { from?: string; to?: string }) => !q.from || !q.to || q.from <= q.to;
export const fromBeforeToIssue = { error: 'from must not be after to', path: ['from'] };
