import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { IdEntity } from '../common/id.entity';

export type WorkspaceRole = 'owner' | 'member';

@Entity('workspaces')
export class Workspace extends IdEntity {
  @Column()
  name: string;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  // Every user gets one personal workspace at registration; it is the default when no workspace is chosen.
  @Column({ name: 'is_personal', default: false })
  isPersonal: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('workspace_members')
export class WorkspaceMember {
  @PrimaryColumn({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', default: 'member' })
  role: WorkspaceRole;
}
