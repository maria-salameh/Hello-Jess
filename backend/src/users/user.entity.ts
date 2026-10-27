import { Column, CreateDateColumn, Entity } from 'typeorm';
import { IdEntity } from '../common/id.entity';

@Entity('users')
export class User extends IdEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'hashed_password' })
  hashedPassword: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// The user as sent to the apps: never the password hash.
export const toUserDto = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  created_at: user.createdAt,
});
