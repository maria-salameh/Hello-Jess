import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentWorkspace, JwtAuthGuard, WorkspaceGuard } from '../auth/auth.guard';
import { isUuid } from '../common/uuid';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import type { Workspace } from '../workspaces/workspace.entity';
import { type NoteCreateInput, type NoteUpdateInput, noteCreateSchema, noteUpdateSchema } from './note.schemas';
import { NotesService } from './notes.service';

function assertId(id: string) {
  if (!isUuid(id)) throw validationException([{ field: 'id', message: 'id must be a valid note id' }]);
}

@Controller('notes')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentWorkspace() ws: Workspace) {
    return this.notes.list(ws.id);
  }

  @Post()
  create(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(noteCreateSchema)) body: NoteCreateInput,
  ) {
    return this.notes.create(ws.id, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(noteUpdateSchema)) body: NoteUpdateInput,
  ) {
    assertId(id);
    return this.notes.update(ws.id, user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentWorkspace() ws: Workspace, @Param('id') id: string) {
    assertId(id);
    await this.notes.remove(ws.id, id);
  }
}
