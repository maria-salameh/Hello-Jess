import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { isUniqueViolation } from '../users/users.service';
import { Habit, HabitEvent } from './habit.entity';
import type { HabitCreateInput, HabitRangeQuery, HabitUpdateInput } from './habit.schemas';

const dateFilter = ({ from, to }: HabitRangeQuery) =>
  from && to ? Between(from, to) : from ? MoreThanOrEqual(from) : to ? LessThanOrEqual(to) : undefined;

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit) private readonly habits: Repository<Habit>,
    @InjectRepository(HabitEvent) private readonly events: Repository<HabitEvent>,
    private readonly realtime: RealtimeService,
  ) {}

  private async own(userId: string, id: string) {
    const habit = await this.habits.findOneBy({ id, ownerId: userId });
    if (!habit) throw new NotFoundException({ detail: 'Habit not found' });
    return habit;
  }

  // The user's habits. With a from/to period, each habit also gets "completions": the days it was done.
  async list(userId: string, range: HabitRangeQuery = {}) {
    const habits = await this.habits.find({ where: { ownerId: userId }, order: { createdAt: 'ASC', id: 'ASC' } });
    if (!range.from && !range.to) return habits;

    const date = dateFilter(range);
    const events = await this.events.find({ where: { ownerId: userId, date }, order: { date: 'ASC' } });
    const datesByHabit = new Map<string, string[]>();
    for (const event of events) {
      datesByHabit.set(event.habitId, [...(datesByHabit.get(event.habitId) ?? []), event.date]);
    }
    return habits.map((habit) => ({ ...habit, completions: datesByHabit.get(habit.id) ?? [] }));
  }

  async get(userId: string, id: string) {
    const habit = await this.own(userId, id);
    return { ...habit, totalCompletions: await this.events.countBy({ habitId: id }) };
  }

  async create(userId: string, data: HabitCreateInput) {
    const habit = await this.habits.save(this.habits.create({ ...data, description: data.description ?? '', ownerId: userId }));
    this.realtime.emitToUser(userId, 'habit:changed', { id: habit.id });
    return habit;
  }

  async update(userId: string, id: string, changes: HabitUpdateInput) {
    const habit = await this.own(userId, id);
    Object.assign(habit, changes);
    const saved = await this.habits.save(habit);
    this.realtime.emitToUser(userId, 'habit:changed', { id });
    return saved;
  }

  // Deletes a habit AND all its events (without the habit they would mean nothing).
  async remove(userId: string, id: string) {
    await this.own(userId, id);
    await this.events.delete({ habitId: id });
    await this.habits.delete({ id });
    this.realtime.emitToUser(userId, 'habit:changed', { id });
  }

  // Records that the habit was done that day. `created` is false when the day was already recorded.
  async addEvent(userId: string, habitId: string, date: string) {
    await this.own(userId, habitId);
    const where: FindOptionsWhere<HabitEvent> = { habitId, date };
    const existing = await this.events.findOneBy(where);
    if (existing) return { event: existing, created: false };
    try {
      const event = await this.events.save(this.events.create({ ownerId: userId, habitId, date }));
      this.realtime.emitToUser(userId, 'habit:changed', { id: habitId });
      return { event, created: true };
    } catch (err) {
      // Two devices recorded the same day at once: the unique index refused the second one.
      if (!isUniqueViolation(err)) throw err;
      return { event: (await this.events.findOneBy(where))!, created: false };
    }
  }

  async removeEvent(userId: string, habitId: string, date: string) {
    await this.own(userId, habitId);
    const result = await this.events.delete({ habitId, date });
    if (!result.affected) throw new NotFoundException({ detail: 'No completion recorded for that date' });
    this.realtime.emitToUser(userId, 'habit:changed', { id: habitId });
  }

  async listEvents(userId: string, habitId: string, range: HabitRangeQuery = {}) {
    await this.own(userId, habitId);
    return this.events.find({ where: { habitId, date: dateFilter(range) }, order: { date: 'ASC' } });
  }
}
