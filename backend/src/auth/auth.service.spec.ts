import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as jsonwebtoken from 'jsonwebtoken';
import { User } from '../users/user.entity';
import { AuthCode } from './auth-code.entity';
import { AuthService, hashPassword, verifyPassword } from './auth.service';

const SECRET = 'test-secret';
const config = { mobileTokenExpiresInSeconds: 30 * 24 * 3600 } as never;

function build(existing: Partial<User> | null = null) {
  const stored = existing as User | null;
  const users = {
    findByEmail: jest.fn().mockResolvedValue(stored),
    findById: jest.fn().mockResolvedValue(stored),
    create: jest.fn(async (data) => Object.assign(new User(), { id: randomUUID(), ...data })),
    save: jest.fn(async (user) => user),
  };
  const workspaces = { createPersonal: jest.fn().mockResolvedValue({}) };
  const jwt = new JwtService({ secret: SECRET, signOptions: { algorithm: 'HS256', expiresIn: 60 }, verifyOptions: { algorithms: ['HS256'] } });

  // A one-row stand-in for the auth_codes table.
  let row: AuthCode | null = null;
  const codes = {
    create: jest.fn((data) => Object.assign(new AuthCode(), { attempts: 0, createdAt: new Date(), ...data })),
    save: jest.fn(async (entity: AuthCode) => (row = entity)),
    delete: jest.fn(async () => void (row = null)),
    findOneBy: jest.fn(async () => row),
  };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(users as never, workspaces as never, jwt, codes as never, mail as never, config);
  // The code is only ever in the email, so tests read it from there.
  const lastCode = () => (mail.send.mock.calls.at(-1)![2] as string).match(/\b\d{6}\b/)![0];
  return { service, users, workspaces, jwt, mail, codes, lastCode, row: () => row };
}

describe('passwords', () => {
  it('hashes with bcrypt and verifies correctly', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash).not.toBe('my-secret-password');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword('my-secret-password', hash)).toBe(true);
    expect(await verifyPassword('another-password', hash)).toBe(false);
  });
});

describe('AuthService', () => {
  it('register creates an unverified user and their personal workspace, and emails a code instead of a token', async () => {
    const { service, users, workspaces, mail } = build();
    const result = await service.register({ email: 'a@example.com', name: 'Ada', password: 'pw' });

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@example.com', name: 'Ada', emailVerified: false }));
    expect(workspaces.createPersonal).toHaveBeenCalledWith(expect.any(String), 'Ada');
    expect(result).toEqual({ verification_required: true, purpose: 'verify', email: 'a@example.com' });
    expect(result).not.toHaveProperty('access_token');
    expect(mail.send).toHaveBeenCalledWith('a@example.com', expect.any(String), expect.stringMatching(/\d{6}/));
  });

  it('register refuses an email that is already taken', async () => {
    const { service } = build({ id: randomUUID(), email: 'a@example.com' });
    await expect(service.register({ email: 'a@example.com', name: 'Ada', password: 'pw' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the sign-up code verifies the email and returns a token without the hash', async () => {
    const { service, users, lastCode } = build();
    await service.register({ email: 'a@example.com', name: 'Ada', password: 'pw' });
    const user = (await users.create.mock.results[0].value) as User;
    users.findByEmail.mockResolvedValue(user);

    const result = await service.verify({ email: 'a@example.com', code: lastCode() });
    expect(user.emailVerified).toBe(true);
    expect(result.token_type).toBe('bearer');
    expect(Object.keys(result.user).sort()).toEqual(['created_at', 'email', 'id', 'name']);
  });

  it('login gives the same error for an unknown email and a wrong password', async () => {
    const unknown = build(null);
    await expect(unknown.service.login({ email: 'x@example.com', password: 'pw' })).rejects.toBeInstanceOf(UnauthorizedException);

    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: true, hashedPassword: await hashPassword('right') });
    await expect(known.service.login({ email: 'a@example.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(known.mail.send).not.toHaveBeenCalled();
  });

  it('a correct password only emails a login code; the code gives the token', async () => {
    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: true, hashedPassword: await hashPassword('right') });
    const step1 = await known.service.login({ email: 'a@example.com', password: 'right' });
    expect(step1).toEqual({ verification_required: true, purpose: 'login', email: 'a@example.com' });

    const ok = await known.service.verify({ email: 'a@example.com', code: known.lastCode() });
    expect(ok.access_token).toEqual(expect.any(String));
    // The code is single-use.
    await expect(known.service.verify({ email: 'a@example.com', code: known.lastCode() })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an account that never confirmed its email gets the sign-up code again at login', async () => {
    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: false, hashedPassword: await hashPassword('right') });
    expect(await known.service.login({ email: 'a@example.com', password: 'right' })).toMatchObject({ purpose: 'verify' });
  });

  it('refuses a wrong, expired or over-tried code', async () => {
    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: true, hashedPassword: await hashPassword('right') });
    await known.service.login({ email: 'a@example.com', password: 'right' });
    const good = known.lastCode();
    const bad = good === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) await expect(known.service.verify({ email: 'a@example.com', code: bad })).rejects.toMatchObject({ response: { detail: 'Incorrect code' } });
    await expect(known.service.verify({ email: 'a@example.com', code: good })).rejects.toMatchObject({ response: { detail: expect.stringMatching(/Too many/) } });

    await known.service.login({ email: 'a@example.com', password: 'right' });
    known.row()!.expiresAt = new Date(Date.now() - 1000);
    await expect(known.service.verify({ email: 'a@example.com', code: known.lastCode() })).rejects.toMatchObject({ response: { detail: expect.stringMatching(/expired/) } });
  });

  it('only resends a code for a login that is already waiting, and not too often', async () => {
    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: true, hashedPassword: await hashPassword('right') });
    await expect(known.service.resend({ email: 'a@example.com' })).rejects.toBeInstanceOf(BadRequestException);

    await known.service.login({ email: 'a@example.com', password: 'right' });
    await expect(known.service.resend({ email: 'a@example.com' })).rejects.toMatchObject({ status: 429 });

    known.row()!.createdAt = new Date(Date.now() - 60_000);
    expect(await known.service.resend({ email: 'a@example.com' })).toMatchObject({ purpose: 'login' });
    expect(known.mail.send).toHaveBeenCalledTimes(2);
  });

  it('the phone app gets a token that lasts about a month, the web one a short token', async () => {
    const known = build({ id: randomUUID(), email: 'a@example.com', emailVerified: true, hashedPassword: await hashPassword('right') });
    const lifetime = async (client: 'web' | 'mobile') => {
      await known.service.login({ email: 'a@example.com', password: 'right', client });
      const { access_token } = await known.service.verify({ email: 'a@example.com', code: known.lastCode() });
      const { iat, exp } = known.jwt.decode(access_token) as { iat: number; exp: number };
      return exp - iat;
    };
    expect(await lifetime('web')).toBe(60);
    expect(await lifetime('mobile')).toBe(30 * 24 * 3600);
  });
});

describe('userFromToken', () => {
  const id = '6ac39c9e-78f4-46b9-bc4f-d43a1c2e9f01';
  const user = { id, email: 'a@example.com' } as User;

  it('returns the user the token was issued to', async () => {
    const { service, jwt } = build(user);
    expect(await service.userFromToken(jwt.sign({ sub: id }))).toBe(user);
  });

  it('refuses forged, expired, unsigned, malformed or subject-less tokens', async () => {
    const { service } = build(user);
    const token = jsonwebtoken.sign({ sub: id }, SECRET, { algorithm: 'HS256' });

    expect(await service.userFromToken(token.slice(0, -2) + 'xx')).toBeNull(); // tampered signature
    expect(await service.userFromToken('garbage')).toBeNull();
    expect(await service.userFromToken('')).toBeNull();
    expect(await service.userFromToken(jsonwebtoken.sign({ sub: id }, 'another-secret', { algorithm: 'HS256' }))).toBeNull();
    expect(await service.userFromToken(jsonwebtoken.sign({ sub: id }, SECRET, { algorithm: 'HS256', expiresIn: -10 }))).toBeNull();
    expect(await service.userFromToken(jsonwebtoken.sign({ foo: 'bar' }, SECRET, { algorithm: 'HS256' }))).toBeNull();
    expect(await service.userFromToken(jsonwebtoken.sign({ sub: 'not-a-uuid' }, SECRET, { algorithm: 'HS256' }))).toBeNull();

    const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    expect(await service.userFromToken(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: id })}.`)).toBeNull();
  });

  it('returns null when the user no longer exists', async () => {
    const { service, jwt } = build(null);
    expect(await service.userFromToken(jwt.sign({ sub: id }))).toBeNull();
  });
});
