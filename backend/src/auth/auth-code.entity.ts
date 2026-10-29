import { Column, CreateDateColumn, Entity, Index } from 'typeorm';
import { IdEntity } from '../common/id.entity';

// A one-time code emailed to a user: either to verify a new email address ("verify") or as the second step of a login ("login").
// Only the hash of the code is stored, and a user has at most one code at a time.
@Entity('auth_codes')
export class AuthCode extends IdEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  purpose: 'verify' | 'login';

  // Which app asked: the phone app gets a longer-lived token.
  @Column({ type: 'varchar', length: 10, default: 'web' })
  client: 'web' | 'mobile';

  @Column({ name: 'code_hash' })
  codeHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
