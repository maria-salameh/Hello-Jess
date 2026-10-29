import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string) {
    return this.users.findOneBy({ email });
  }

  findManyByIds(ids: string[]) {
    return ids.length ? this.users.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  create(data: { email: string; name: string; hashedPassword: string; emailVerified: boolean }) {
    return this.users.save(this.users.create(data));
  }

  save(user: User) {
    return this.users.save(user);
  }
}

// Postgres "unique_violation".
export const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === '23505';
