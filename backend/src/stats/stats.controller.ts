import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, CurrentWorkspace, JwtAuthGuard, WorkspaceGuard } from '../auth/auth.guard';
import { addDays, daysBetween, todayIn } from '../common/dates';
import { ZodValidationPipe, validationException } from '../common/zod-validation.pipe';
import type { User } from '../users/user.entity';
import type { Workspace } from '../workspaces/workspace.entity';
import { type CompletionQuery, type HeatmapQuery, completionQuerySchema, heatmapQuerySchema } from './stats.schemas';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  // Activity day by day. Without parameters: the last 52 weeks (364 days) up to today in the user's time zone.
  // Optional: ?from=2026-01-01&to=2026-10-05&tz=Europe/Paris
  @Get('heatmap')
  heatmap(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(heatmapQuerySchema, 'query')) query: HeatmapQuery,
  ) {
    const timeZone = query.tz ?? 'UTC';
    const to = query.to ?? todayIn(timeZone);
    const from = query.from ?? addDays(to, -363);

    // Guard rails: the range runs the right way and is at most 366 days (to limit server work).
    if (from > to) throw validationException([{ field: 'from', message: 'from must not be after to' }]);
    if (daysBetween(from, to) > 365) {
      throw validationException([{ field: 'from', message: 'The period must not exceed 366 days' }]);
    }
    return this.stats.heatmap(ws.id, user.id, { from, to, timeZone });
  }

  // Completion rate per week or month, and its change. Optional: ?period=week|month&count=12&tz=Europe/Paris
  @Get('completion')
  completion(
    @CurrentWorkspace() ws: Workspace,
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(completionQuerySchema, 'query')) query: CompletionQuery,
  ) {
    const timeZone = query.tz ?? 'UTC';
    return this.stats.completion(ws.id, user.id, {
      period: query.period ?? 'week',
      count: query.count ?? 12,
      timeZone,
      today: todayIn(timeZone),
    });
  }
}
