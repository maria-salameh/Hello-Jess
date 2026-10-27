import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../auth/auth.guard';
import { isUuid } from '../common/uuid';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import { memberAddSchema, workspaceCreateSchema } from './workspace.schemas';
import { WorkspacesService } from './workspaces.service';

function assertUuid(value: string, field: string) {
  if (!isUuid(value)) throw validationException([{ field, message: `${field} must be a valid id` }]);
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.workspaces.listForUser(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(workspaceCreateSchema)) body: { name: string },
  ) {
    const workspace = await this.workspaces.create(user.id, body.name);
    return (await this.workspaces.listForUser(user.id)).find((w) => w.id === workspace.id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(memberAddSchema)) body: { email: string },
  ) {
    assertUuid(id, 'id');
    return this.workspaces.addMember(user.id, id, body.email);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  async removeMember(@CurrentUser() user: User, @Param('id') id: string, @Param('userId') userId: string) {
    assertUuid(id, 'id');
    assertUuid(userId, 'userId');
    await this.workspaces.removeMember(user.id, id, userId);
  }
}
