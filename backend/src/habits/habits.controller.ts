import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
import { isValidCivilDate } from '../common/dates';
import { isUuid } from '../common/uuid';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import {
  type HabitCreateInput,
  type HabitRangeQuery,
  type HabitUpdateInput,
  habitCreateSchema,
  habitEventCreateSchema,
  habitRangeQuerySchema,
  habitUpdateSchema,
} from './habit.schemas';
import { HabitsService } from './habits.service';

function assertId(id: string) {
  if (!isUuid(id)) throw validationException([{ field: 'id', message: 'id must be a valid habit id' }]);
}

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query(new ZodValidationPipe(habitRangeQuerySchema, 'query')) query: HabitRangeQuery) {
    return this.habits.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: User, @Body(new ZodValidationPipe(habitCreateSchema)) body: HabitCreateInput) {
    return this.habits.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    assertId(id);
    return this.habits.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(habitUpdateSchema)) body: HabitUpdateInput,
  ) {
    assertId(id);
    return this.habits.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    assertId(id);
    await this.habits.remove(user.id, id);
  }

  @Get(':id/events')
  events(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(habitRangeQuerySchema, 'query')) query: HabitRangeQuery,
  ) {
    assertId(id);
    return this.habits.listEvents(user.id, id, query);
  }

  // 201 when the day was just added, 200 when it was already recorded.
  @Post(':id/events')
  async addEvent(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(habitEventCreateSchema)) body: { date: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    assertId(id);
    const { event, created } = await this.habits.addEvent(user.id, id, body.date);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return event;
  }

  @Delete(':id/events/:date')
  @HttpCode(204)
  async removeEvent(@CurrentUser() user: User, @Param('id') id: string, @Param('date') date: string) {
    assertId(id);
    if (!isValidCivilDate(date)) {
      throw validationException([{ field: 'date', message: 'date must be a real calendar date in YYYY-MM-DD format' }]);
    }
    await this.habits.removeEvent(user.id, id, date);
  }
}
