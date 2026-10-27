import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { noteEditSchema } from './note.schemas';
import { NotesService } from './notes.service';

type Ack = { ok: true; note: unknown } | { ok: false; detail: string };

// Live note editing over the WebSocket: `socket.emit('note:edit', { id, title?, content? }, ack)`.
// The edit is validated, saved to PostgreSQL, then broadcast to everyone in the workspace as `note:updated`.
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? '*' } })
export class NotesGateway {
  constructor(
    private readonly notes: NotesService,
    private readonly workspaces: WorkspacesService,
  ) {}

  @SubscribeMessage('note:edit')
  async edit(@ConnectedSocket() client: Socket, @MessageBody() body: unknown): Promise<Ack> {
    const userId = client.data.userId as string | undefined;
    if (!userId) return { ok: false, detail: 'Not authenticated' };

    const parsed = noteEditSchema.safeParse(body);
    if (!parsed.success) return { ok: false, detail: parsed.error.issues[0]?.message ?? 'Invalid edit' };

    try {
      const { id, workspaceId, ...changes } = parsed.data;
      const workspace = await this.workspaces.resolve(userId, workspaceId);
      return { ok: true, note: await this.notes.update(workspace.id, userId, id, changes) };
    } catch (err) {
      const detail = (err as { response?: { detail?: string } }).response?.detail ?? 'Could not save the edit';
      return { ok: false, detail };
    }
  }
}
