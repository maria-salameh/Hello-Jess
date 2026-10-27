import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentWorkspace, JwtAuthGuard, WorkspaceGuard } from '../auth/auth.guard';
import { isUuid } from '../common/uuid';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { Workspace } from '../workspaces/workspace.entity';
import { type TimerAction } from './timer.logic';
import { type TimerCreateInput, timerActionSchema, timerCreateSchema } from './timer.schemas';
import { TimersService } from './timers.service';

function assertId(id: string) {
  if (!isUuid(id)) throw validationException([{ field: 'id', message: 'id must be a valid timer id' }]);
}

@Controller('timers')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class TimersController {
  constructor(private readonly timers: TimersService) {}

  @Get()
  list(@CurrentWorkspace() ws: Workspace) {
    return this.timers.list(ws.id);
  }

  @Post()
  create(@CurrentWorkspace() ws: Workspace, @Body(new ZodValidationPipe(timerCreateSchema)) body: TimerCreateInput) {
    return this.timers.create(ws.id, body);
  }

  // POST /api/timers/:id/action with { "action": "start" | "pause" | "reset" }
  @Post(':id/action')
  @HttpCode(200)
  act(
    @CurrentWorkspace() ws: Workspace,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(timerActionSchema)) body: { action: TimerAction },
  ) {
    assertId(id);
    return this.timers.act(ws.id, id, body.action);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentWorkspace() ws: Workspace, @Param('id') id: string) {
    assertId(id);
    await this.timers.remove(ws.id, id);
  }
}
