import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { Note } from './note.entity';
import type { NoteCreateInput, NoteUpdateInput } from './note.schemas';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private readonly notes: Repository<Note>,
    private readonly realtime: RealtimeService,
  ) {}

  // Most recently edited first.
  list(workspaceId: string) {
    return this.notes.find({ where: { workspaceId }, order: { updatedAt: 'DESC', id: 'ASC' } });
  }

  async get(workspaceId: string, id: string) {
    const note = await this.notes.findOneBy({ id, workspaceId });
    if (!note) throw new NotFoundException({ detail: 'Note not found' });
    return note;
  }

  async create(workspaceId: string, userId: string, data: NoteCreateInput) {
    const note = await this.notes.save(this.notes.create({ ...data, workspaceId, updatedById: userId, version: 1 }));
    this.realtime.emitToWorkspace(workspaceId, 'note:created', note);
    return note;
  }

  // Used by both the REST route and the WebSocket `note:edit` message.
  async update(workspaceId: string, userId: string, id: string, changes: NoteUpdateInput) {
    const note = await this.get(workspaceId, id);
    if (changes.title !== undefined) note.title = changes.title;
    if (changes.content !== undefined) note.content = changes.content;
    note.updatedById = userId;
    note.version += 1;
    const saved = await this.notes.save(note);
    this.realtime.emitToWorkspace(workspaceId, 'note:updated', saved);
    return saved;
  }

  async remove(workspaceId: string, id: string) {
    const result = await this.notes.delete({ id, workspaceId });
    if (!result.affected) throw new NotFoundException({ detail: 'Note not found' });
    this.realtime.emitToWorkspace(workspaceId, 'note:deleted', { id });
  }
}
