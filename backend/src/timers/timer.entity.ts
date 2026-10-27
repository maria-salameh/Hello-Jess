import { Column, CreateDateColumn, Entity, Index } from 'typeorm';
import { IdEntity } from '../common/id.entity';
import type { TimerStatus } from './timer.logic';

@Entity('timers')
export class Timer extends IdEntity {
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs: number;

  @Column({ name: 'remaining_ms', type: 'int' })
  remainingMs: number;

  @Column({ type: 'varchar', length: 7, default: 'idle' })
  status: TimerStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
