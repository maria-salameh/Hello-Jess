import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, Between, In, IsNull, LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { addDays } from '../common/dates';
import { Habit, HabitEvent } from '../habits/habit.entity';
import { Task } from '../tasks/task.entity';
import { buildCalendarEvents } from './calendar.events';

// Fetches the workspace's tasks and the user's habits for a period, then hands the assembly to calendar.events.ts.
// An unfinished task always appears: on its due date if it has one, otherwise on the day it was added.
@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(Habit) private readonly habits: Repository<Habit>,
    @InjectRepository(HabitEvent) private readonly habitEvents: Repository<HabitEvent>,
  ) {}

  async get(
    workspaceId: string,
    userId: string,
    { from, to, timeZone, today }: { from: string; to: string; timeZone: string; today: string },
  ) {
    // One day of margin on each side for instants: depending on the time zone, an instant near the edge of the
    // period can fall inside it. The exact sorting by day is redone afterwards, with the time zone.
    const lower = new Date(`${addDays(from, -1)}T00:00:00.000Z`);
    const upper = new Date(`${addDays(to, 2)}T00:00:00.000Z`);
    const instantInRange = (column: 'createdAt' | 'completedAt') => ({
      [column]: And(MoreThanOrEqual(lower), LessThan(upper)),
    });
    const open = { workspaceId, status: Not('done') as never };

    // Overdue tasks due before the period are only looked up if today is in the period (that is where they are shown).
    const showOverdue = today >= from && today <= to;

    const [dueTasks, overdueTasks, undatedTasks, completedTasks, habitDays] = await Promise.all([
      this.tasks.findBy({ ...open, dueDate: Between(from, to) }),
      showOverdue ? this.tasks.findBy({ ...open, dueDate: LessThan(from) }) : Promise.resolve([]),
      this.tasks.findBy({ ...open, dueDate: IsNull(), ...instantInRange('createdAt') }),
      this.tasks.findBy({ workspaceId, ...instantInRange('completedAt') }),
      this.habitEvents.findBy({ ownerId: userId, date: Between(from, to) }),
    ]);

    // Habit events only hold the habit id: the names come in a single query.
    const habitIds = [...new Set(habitDays.map((event) => event.habitId))];
    const habits = habitIds.length ? await this.habits.findBy({ id: In(habitIds) }) : [];
    const nameById = new Map(habits.map((habit) => [habit.id, habit.name]));

    const events = buildCalendarEvents({
      from,
      to,
      today,
      timeZone,
      dueTasks,
      overdueTasks,
      undatedTasks,
      completedTasks,
      habitEvents: habitDays.map((event) => ({
        date: event.date,
        habitId: event.habitId,
        habitName: nameById.get(event.habitId) ?? 'Habit',
      })),
    });
    return { from, to, timeZone, events };
  }
}
