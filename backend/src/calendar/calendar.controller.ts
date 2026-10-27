import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentWorkspace, JwtAuthGuard, WorkspaceGuard } from '../auth/auth.guard';
import { daysBetween, todayIn } from '../common/dates';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import type { Workspace } from '../workspaces/workspace.entity';
import { type CalendarQuery, calendarQuerySchema } from './calendar.schemas';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  // GET /api/calendar?from=2026-09-28&to=2026-11-08&tz=Europe/Paris
  @Get()
  get(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(calendarQuerySchema, 'query')) { from, to, tz }: CalendarQuery,
  ) {
    // A calendar view shows about 6 weeks at most: limit to 62 days to limit server work.
    if (daysBetween(from, to) > 61) {
      throw validationException([{ field: 'from', message: 'The period must not exceed 62 days' }]);
    }
    // "Today" depends on the user's time zone; it is where overdue tasks are carried.
    const timeZone = tz ?? 'UTC';
    return this.calendar.get(ws.id, user.id, { from, to, timeZone, today: todayIn(timeZone) });
  }
}
