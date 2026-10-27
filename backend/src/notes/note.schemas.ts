import { z } from 'zod';
import { optionalText } from '../common/schema-parts';

const title = optionalText('title', 120);
const content = optionalText('content', 20000);

export const noteCreateSchema = z.object({
  title: title.default(''),
  content: content.default(''),
});

export const noteUpdateSchema = z.object({
  title: title.optional(),
  content: content.optional(),
});

// A live edit sent over the WebSocket.
export const noteEditSchema = noteUpdateSchema.extend({
  id: z.string().uuid({ error: 'id must be a valid note id' }),
  workspaceId: z.string().uuid({ error: 'workspaceId must be a valid workspace id' }).optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
export type NoteEditInput = z.infer<typeof noteEditSchema>;
