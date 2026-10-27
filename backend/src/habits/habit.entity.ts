import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from 'typeorm';
import { IdEntity } from '../common/id.entity';

// A recurring habit. Habits are private to their owner (they are not shared with a workspace).
@Entity('habits')
export class Habit extends IdEntity {
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

// One row per day a habit was done. A habit can be done once per day: the unique index refuses duplicates.
@Entity('habit_events')
@Index(['habitId', 'date'], { unique: true })
export class HabitEvent extends IdEntity {
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'habit_id', type: 'uuid' })
  habitId: string;

  // The day in the user's own calendar "YYYY-MM-DD", so it depends on no time zone.
  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
