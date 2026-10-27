import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as jsonwebtoken from 'jsonwebtoken';
import { User } from '../users/user.entity';
import { AuthService, hashPassword, verifyPassword } from './auth.service';

const SECRET = 'test-secret';

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
  return { service: new AuthService(users as never, workspaces as never, jwt), users, workspaces, jwt };
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
  it('register creates the user and their personal workspace, and returns a token without the hash', async () => {
    const { service, users, workspaces } = build();
    const result = await service.register({ email: 'a@example.com', name: 'Ada', password: 'pw' });

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@example.com', name: 'Ada' }));
    expect(workspaces.createPersonal).toHaveBeenCalledWith(result.user.id, 'Ada');
    expect(result.token_type).toBe('bearer');
    expect(result.user).not.toHaveProperty('hashedPassword');
    expect(Object.keys(result.user).sort()).toEqual(['created_at', 'email', 'id', 'name']);
  });

  it('register refuses an email that is already taken', async () => {
    const { service } = build({ id: randomUUID(), email: 'a@example.com' });
    await expect(service.register({ email: 'a@example.com', name: 'Ada', password: 'pw' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login gives the same error for an unknown email and a wrong password', async () => {
    const unknown = build(null);
    await expect(unknown.service.login({ email: 'x@example.com', password: 'pw' })).rejects.toBeInstanceOf(UnauthorizedException);

    const known = build({ id: randomUUID(), email: 'a@example.com', hashedPassword: await hashPassword('right') });
    await expect(known.service.login({ email: 'a@example.com', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    const ok = await known.service.login({ email: 'a@example.com', password: 'right' });
    expect(ok.access_token).toEqual(expect.any(String));
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
