import { Column, CreateDateColumn, Entity, Index, UpdateDateColumn } from 'typeorm';
import { IdEntity } from '../common/id.entity';

@Entity('notes')
export class Note extends IdEntity {
  @Index()
  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ length: 120, default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  content: string;

  // Who saved the last edit; with `version` it lets the apps tell their own echo from someone else's edit.
  @Column({ name: 'updated_by_id', type: 'uuid' })
  updatedById: string;

  // Increases on every save. Edits are last-write-wins.
  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
