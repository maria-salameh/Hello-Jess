import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentWorkspace, JwtAuthGuard, WorkspaceGuard } from '../auth/auth.guard';
import { isUuid } from '../common/uuid';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import type { Workspace } from '../workspaces/workspace.entity';
import {
  type TaskCreateInput,
  type TaskListQuery,
  type TaskUpdateInput,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from './task.schemas';
import { TasksService } from './tasks.service';

function assertId(id: string) {
  if (!isUuid(id)) throw validationException([{ field: 'id', message: 'id must be a valid task id' }]);
}

@Controller('tasks')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // Filters: ?status=todo&priority=high&dueFrom=2026-10-01&dueTo=2026-10-31&noDueDate=true
  @Get()
  list(@CurrentWorkspace() ws: Workspace, @Query(new ZodValidationPipe(taskListQuerySchema, 'query')) query: TaskListQuery) {
    return this.tasks.list(ws.id, query);
  }

  @Get('count')
  count(@CurrentWorkspace() ws: Workspace) {
    return this.tasks.count(ws.id);
  }

  @Get(':id')
  get(@CurrentWorkspace() ws: Workspace, @Param('id') id: string) {
    assertId(id);
    return this.tasks.get(ws.id, id);
  }

  @Post()
  create(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(taskCreateSchema)) body: TaskCreateInput,
  ) {
    return this.tasks.create(ws.id, user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentWorkspace() ws: Workspace,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(taskUpdateSchema)) body: TaskUpdateInput,
  ) {
    assertId(id);
    return this.tasks.update(ws.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentWorkspace() ws: Workspace, @Param('id') id: string) {
    assertId(id);
    await this.tasks.remove(ws.id, id);
  }
}
