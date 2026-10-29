import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { isUuid } from '../common/uuid';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { MailService } from '../mail/mail.service';
import { User, toUserDto } from '../users/user.entity';
import { UsersService, isUniqueViolation } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthCode } from './auth-code.entity';
import type { LoginInput, ProfileUpdateInput, RegisterInput, ResendInput, VerifyInput } from './auth.schemas';

// bcrypt cost: higher is slower for an attacker, but also for us.
const BCRYPT_COST = 12;

// A code is valid for 10 minutes and 5 wrong guesses; a new one can be requested every 30 seconds.
const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30_000;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Only this hash of a code is stored. The user id is mixed in so two users with the same code get different hashes.
const hashCode = (code: string, userId: string) => createHash('sha256').update(`${userId}:${code}`).digest('hex');

const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

type Client = 'web' | 'mobile';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly workspaces: WorkspacesService,
    private readonly jwt: JwtService,
    @InjectRepository(AuthCode) private readonly codes: Repository<AuthCode>,
    private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // The token identifies the user by id, which never changes (unlike the email). The phone app gets a longer one.
  private tokenResponse(user: User, client: Client = 'web') {
    const token =
      client === 'mobile'
        ? this.jwt.sign({ sub: user.id }, { expiresIn: this.config.mobileTokenExpiresInSeconds })
        : this.jwt.sign({ sub: user.id });
    return { access_token: token, token_type: 'bearer', user: toUserDto(user) };
  }

  // Creates a fresh six-digit code (replacing any older one), emails it, and tells the app to ask for it.
  private async issueCode(user: User, purpose: 'verify' | 'login', client: Client) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.codes.delete({ userId: user.id });
    await this.codes.save(
      this.codes.create({ userId: user.id, purpose, client, codeHash: hashCode(code, user.id), expiresAt: new Date(Date.now() + CODE_TTL_MS) }),
    );
    const subject = purpose === 'verify' ? 'Verify your HelloJess email' : 'Your HelloJess login code';
    const intro = purpose === 'verify' ? 'Welcome to HelloJess. Use this code to verify your email address' : 'Use this code to finish logging in to HelloJess';
    await this.mail.send(user.email, subject, `${intro}:\n\n${code}\n\nIt expires in 10 minutes. If this was not you, ignore this email.`);
    return { verification_required: true as const, purpose, email: user.email };
  }

  async register({ email, name, password, client = 'web' }: RegisterInput) {
    if (await this.users.findByEmail(email)) throw new BadRequestException({ detail: 'Email already registered' });
    try {
      const user = await this.users.create({ email, name, hashedPassword: await hashPassword(password), emailVerified: false });
      await this.workspaces.createPersonal(user.id, user.name);
      return await this.issueCode(user, 'verify', client);
    } catch (err) {
      if (isUniqueViolation(err)) throw new BadRequestException({ detail: 'Email already registered' });
      throw err;
    }
  }

  // Step one of a login: the password. It does not give a token; the code emailed to the user does (see verify).
  async login({ email, password, client = 'web' }: LoginInput) {
    const user = await this.users.findByEmail(email);
    // Same error for "unknown email" and "wrong password" so emails cannot be guessed.
    if (!user || !(await verifyPassword(password, user.hashedPassword))) {
      throw new UnauthorizedException({ detail: 'Incorrect email or password' });
    }
    // An account that never confirmed its email gets the sign-up code again.
    return this.issueCode(user, user.emailVerified ? 'login' : 'verify', client);
  }

  // Step two: the emailed code. Confirms the email when it was a sign-up code, then logs the user in.
  async verify({ email, code }: VerifyInput) {
    const wrong = new BadRequestException({ detail: 'Incorrect code' });
    const user = await this.users.findByEmail(email);
    const pending = user ? await this.codes.findOneBy({ userId: user.id }) : null;
    if (!user || !pending) throw wrong;
    if (pending.expiresAt.getTime() < Date.now()) throw new BadRequestException({ detail: 'This code has expired. Request a new one.' });
    if (pending.attempts >= MAX_ATTEMPTS) throw new BadRequestException({ detail: 'Too many wrong codes. Request a new one.' });

    if (!sameHash(pending.codeHash, hashCode(code, user.id))) {
      pending.attempts += 1;
      await this.codes.save(pending);
      throw wrong;
    }

    await this.codes.delete({ userId: user.id });
    if (pending.purpose === 'verify' && !user.emailVerified) {
      user.emailVerified = true;
      await this.users.save(user);
    }
    return this.tokenResponse(user, pending.client);
  }

  // Sends a new code for a login or sign-up that is already waiting for one (it needs the password or the sign-up first).
  async resend({ email }: ResendInput) {
    const user = await this.users.findByEmail(email);
    const pending = user ? await this.codes.findOneBy({ userId: user.id }) : null;
    if (!user || !pending) throw new BadRequestException({ detail: 'Log in or sign up first.' });
    if (Date.now() - pending.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new HttpException({ detail: 'Please wait a few seconds before asking for another code.' }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.issueCode(user, pending.purpose, pending.client);
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
