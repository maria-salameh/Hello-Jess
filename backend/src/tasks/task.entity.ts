import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from 'typeorm';
import { IdEntity } from '../common/id.entity';
import type { TaskPriority, TaskStatus } from './task.schemas';

@Entity('tasks')
export class Task extends IdEntity {
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @Column({ length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 5 })
  status: TaskStatus;

  @Column({ type: 'text', default: '' })
  description: string;

  // A calendar day "YYYY-MM-DD" (no time, so no time zone), or null.
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', length: 6, default: 'medium' })
  priority: TaskPriority;

  // When the task became "done" (null otherwise). Set by the server; feeds the heatmap and statistics.
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
