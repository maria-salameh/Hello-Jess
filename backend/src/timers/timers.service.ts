import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { Timer } from './timer.entity';
import type { TimerCreateInput } from './timer.schemas';
import { type TimerAction, applyTimerAction } from './timer.logic';

// A timer as sent to the apps: with `serverTime` so a device can correct for a wrong clock.
export const toTimerDto = (timer: Timer) => ({ ...timer, serverTime: new Date().toISOString() });

@Injectable()
export class TimersService {
  constructor(
    @InjectRepository(Timer) private readonly timers: Repository<Timer>,
    private readonly realtime: RealtimeService,
  ) {}

  async list(workspaceId: string) {
    const timers = await this.timers.find({ where: { workspaceId }, order: { createdAt: 'ASC', id: 'ASC' } });
    return timers.map(toTimerDto);
  }

  async create(workspaceId: string, { label, durationSeconds }: TimerCreateInput) {
    const durationMs = durationSeconds * 1000;
    const timer = await this.timers.save(
      this.timers.create({ workspaceId, label, durationMs, remainingMs: durationMs, status: 'idle', startedAt: null }),
    );
    const dto = toTimerDto(timer);
    this.realtime.emitToWorkspace(workspaceId, 'timer:created', dto);
    return dto;
  }

  async act(workspaceId: string, id: string, action: TimerAction) {
    const timer = await this.timers.findOneBy({ id, workspaceId });
    if (!timer) throw new NotFoundException({ detail: 'Timer not found' });
    Object.assign(timer, applyTimerAction(timer, action, new Date()));
    const dto = toTimerDto(await this.timers.save(timer));
    this.realtime.emitToWorkspace(workspaceId, 'timer:updated', dto);
    return dto;
  }

  async remove(workspaceId: string, id: string) {
    const result = await this.timers.delete({ id, workspaceId });
    if (!result.affected) throw new NotFoundException({ detail: 'Timer not found' });
    this.realtime.emitToWorkspace(workspaceId, 'timer:deleted', { id });
  }
}
