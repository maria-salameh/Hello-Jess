import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { addDays } from '../common/dates';
import { HabitEvent } from '../habits/habit.entity';
import { Task } from '../tasks/task.entity';
import { buildHeatmap, buildPeriods, completionByPeriod } from './stats.calculations';

// Fetches the data, then leaves the calculations to the pure functions of stats.calculations.ts.
// Tasks come from the current workspace; habits are the user's own.
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(HabitEvent) private readonly events: Repository<HabitEvent>,
  ) {}

  async heatmap(workspaceId: string, userId: string, { from, to, timeZone }: { from: string; to: string; timeZone: string }) {
    // One day of margin on each side: depending on the time zone, an instant near the edge can belong to
    // the period. The exact day sorting is done afterwards, with the time zone.
    const lower = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
    const upper = new Date(`${addDays(to, 2)}T00:00:00.000Z`);

    const [tasks, events] = await Promise.all([
      this.tasks
        .createQueryBuilder('task')
        .select('task.completedAt', 'completedAt')
        .where('task.workspaceId = :workspaceId', { workspaceId })
        .andWhere('task.completedAt >= :lower AND task.completedAt < :upper', { lower, upper })
        .getRawMany<{ completedAt: Date }>(),
      this.events.find({ where: { ownerId: userId, date: Between(from, to) }, select: { date: true } }),
    ]);

    const { days, max } = buildHeatmap({
      from,
      to,
      taskCompletedAts: tasks.map((task) => new Date(task.completedAt)),
      habitDates: events.map((event) => event.date),
      timeZone,
    });
    return { from, to, timeZone, max, days };
  }

  async completion(
    workspaceId: string,
    userId: string,
    { period, count, timeZone, today }: { period: 'week' | 'month'; count: number; timeZone: string; today: string },
  ) {
    const periods = buildPeriods(today, period, count);
    const first = periods[0].start;
    const last = periods[periods.length - 1].end;

    const [tasks, events] = await Promise.all([
      this.tasks.find({ where: { workspaceId }, select: { createdAt: true, completedAt: true } }),
      this.events.find({ where: { ownerId: userId, date: Between(first, last) }, select: { date: true } }),
    ]);

    const items = completionByPeriod({ tasks, habitDates: events.map((e) => e.date), periods, timeZone });
    return { period, timeZone, today, items };
  }
}
