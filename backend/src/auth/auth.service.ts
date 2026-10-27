import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isUuid } from '../common/uuid';
import { User, toUserDto } from '../users/user.entity';
import { UsersService, isUniqueViolation } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { LoginInput, ProfileUpdateInput, RegisterInput } from './auth.schemas';

// bcrypt cost: higher is slower for an attacker, but also for us.
const BCRYPT_COST = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workspaces: WorkspacesService,
    private readonly jwt: JwtService,
  ) {}

  // The token identifies the user by id, which never changes (unlike the email).
  private tokenResponse(user: User) {
    return { access_token: this.jwt.sign({ sub: user.id }), token_type: 'bearer', user: toUserDto(user) };
  }

  async register({ email, name, password }: RegisterInput) {
    if (await this.users.findByEmail(email)) throw new BadRequestException({ detail: 'Email already registered' });
    try {
      const user = await this.users.create({ email, name, hashedPassword: await hashPassword(password) });
      await this.workspaces.createPersonal(user.id, user.name);
      return this.tokenResponse(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException({ detail: 'Email already registered' });
      throw err;
    }
  }

  async login({ email, password }: LoginInput) {
    const user = await this.users.findByEmail(email);
    // Same error for "unknown email" and "wrong password" so emails cannot be guessed.
    if (!user || !(await verifyPassword(password, user.hashedPassword))) {
      throw new UnauthorizedException({ detail: 'Incorrect email or password' });
    }
    return this.tokenResponse(user);
  }

  async updateProfile(user: User, changes: ProfileUpdateInput) {
    if (changes.name !== undefined) user.name = changes.name;
    if (changes.email !== undefined) user.email = changes.email;
    try {
      await this.users.save(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException({ detail: 'Email already registered' });
      throw err;
    }
    return this.tokenResponse(user);
  }

  // The user a token was issued to, or null when the token is invalid, forged, expired or its user is gone.
  async userFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwt.verify<{ sub?: unknown }>(token);
      if (!isUuid(payload.sub)) return null;
      return await this.users.findById(payload.sub);
    } catch {
      return null;
    }
  }
}
