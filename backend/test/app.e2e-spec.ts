// End-to-end: the real Nest app, a real PostgreSQL (see global-setup.mjs) and real socket.io clients.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

let app: INestApplication;
let http: ReturnType<INestApplication['getHttpServer']>;
let url: string;
const sockets: Socket[] = [];

type Account = { token: string; id: string; email: string };
const auth = (a: Account) => ({ Authorization: `Bearer ${a.token}` });
const unique = () => Math.random().toString(36).slice(2, 10);

async function register(name = 'Ada'): Promise<Account> {
  const email = `${name.toLowerCase()}-${unique()}@example.com`;
  const res = await request(http).post('/api/auth/register').send({ email, name, password: 'pw-123456' }).expect(201);
  return { token: res.body.access_token, id: res.body.user.id, email };
}

// Connects a socket; the server has already put it in its rooms when 'connect' fires.
async function connect(token: string): Promise<Socket> {
  const socket = io(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  return socket;
}

const nextEvent = <T = any>(socket: Socket, event: string, ms = 3000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No "${event}" event within ${ms} ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

// Resolves true if the event does NOT arrive during the window.
const silentFor = (socket: Socket, event: string, ms = 400) =>
  new Promise<boolean>((resolve) => {
    const handler = () => resolve(false);
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve(true);
    }, ms);
  });

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  http = app.getHttpServer();
  url = await app.getUrl().then((u) => u.replace('[::1]', 'localhost'));
});

afterEach(() => {
  while (sockets.length) sockets.pop()!.disconnect();
});

afterAll(async () => {
  await app.close();
});

describe('health and errors', () => {
  it('GET /health checks the database', async () => {
    await request(http).get('/health').expect(200, { status: 'ok' });
  });

  it('unknown routes and bad JSON keep the { detail } shape', async () => {
    await request(http).get('/api/nope').expect(404).expect((r) => expect(r.body.detail).toBeDefined());
    await request(http).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops').expect(400, { detail: 'Invalid JSON body' });
  });
});

describe('accounts', () => {
  it('registers, logs in, reads and edits the profile', async () => {
    const email = `maria-${unique()}@example.com`;
    const reg = await request(http).post('/api/auth/register').send({ email, name: 'Maria', password: 'secret-pw' }).expect(201);
    expect(reg.body.user).toMatchObject({ email, name: 'Maria' });
    expect(reg.body.user.hashedPassword).toBeUndefined();

    await request(http).post('/api/auth/register').send({ email, name: 'Dup', password: 'x' }).expect(400, { detail: 'Email already registered' });
    await request(http).post('/api/auth/login').send({ email, password: 'wrong' }).expect(401);
    const login = await request(http).post('/api/auth/login').send({ email, password: 'secret-pw' }).expect(200);

    const headers = { Authorization: `Bearer ${login.body.access_token}` };
    await request(http).get('/api/auth/me').set(headers).expect(200).expect((r) => expect(r.body.email).toBe(email));

    const patched = await request(http).patch('/api/auth/me').set(headers).send({ name: 'Maria S.' }).expect(200);
    expect(patched.body.user.name).toBe('Maria S.');
    await request(http).patch('/api/auth/me').set(headers).send({ email: 'nope' }).expect(422);
  });

  it('rejects requests without a valid token', async () => {
    await request(http).get('/api/tasks').expect(401);
    await request(http).get('/api/tasks').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('refuses an email already used when editing the profile', async () => {
    const [a, b] = [await register('Ann'), await register('Bob')];
    await request(http).patch('/api/auth/me').set(auth(b)).send({ email: a.email }).expect(400, { detail: 'Email already registered' });
  });
});

describe('tasks', () => {
  it('creates, filters, updates, counts and deletes tasks', async () => {
    const me = await register();
    const make = (body: object) => request(http).post('/api/tasks').set(auth(me)).send(body);

    const open = (await make({ title: 'Write report', status: 'todo', dueDate: '2026-10-07', priority: 'high' }).expect(201)).body;
    expect(open).toMatchObject({ title: 'Write report', status: 'todo', dueDate: '2026-10-07', priority: 'high', completedAt: null });
    await make({ title: 'Undated', status: 'doing' }).expect(201);
    await make({ title: '', status: 'todo' }).expect(422).expect((r) => expect(r.body.errors[0]).toEqual({ field: 'title', message: 'title must not be empty' }));

    const list = await request(http).get('/api/tasks').set(auth(me)).expect(200);
    expect(list.body.map((t: any) => t.title)).toEqual(['Write report', 'Undated']); // dated first
    const high = await request(http).get('/api/tasks?priority=high').set(auth(me)).expect(200);
    expect(high.body).toHaveLength(1);
    const undated = await request(http).get('/api/tasks?noDueDate=true').set(auth(me)).expect(200);
    expect(undated.body.map((t: any) => t.title)).toEqual(['Undated']);
    await request(http).get('/api/tasks?dueFrom=2026-12-01&dueTo=2026-01-01').set(auth(me)).expect(422);

    const done = await request(http).patch(`/api/tasks/${open.id}`).set(auth(me)).send({ status: 'done' }).expect(200);
    expect(done.body.completedAt).toEqual(expect.any(String));
    await request(http).get('/api/tasks/count').set(auth(me)).expect(200, { total: 2, todo: 0, doing: 1, done: 1 });

    await request(http).get('/api/tasks/not-an-id').set(auth(me)).expect(422);
    await request(http).delete(`/api/tasks/${open.id}`).set(auth(me)).expect(204);
    await request(http).get(`/api/tasks/${open.id}`).set(auth(me)).expect(404);
  });

  it("keeps each user's tasks private", async () => {
    const [a, b] = [await register('Ann'), await register('Bob')];
    const task = (await request(http).post('/api/tasks').set(auth(a)).send({ title: 'Secret', status: 'todo' }).expect(201)).body;

    await request(http).get(`/api/tasks/${task.id}`).set(auth(b)).expect(404);
    await request(http).patch(`/api/tasks/${task.id}`).set(auth(b)).send({ title: 'hacked' }).expect(404);
    await request(http).delete(`/api/tasks/${task.id}`).set(auth(b)).expect(404);
    expect((await request(http).get('/api/tasks').set(auth(b)).expect(200)).body).toEqual([]);
    // Asking for someone else's workspace is refused too.
    const wsA = (await request(http).get('/api/workspaces').set(auth(a)).expect(200)).body[0].id;
    await request(http).get('/api/tasks').set(auth(b)).set('X-Workspace-Id', wsA).expect(404);
  });
});

describe('habits, calendar and statistics', () => {
  it('tracks a habit day by day and feeds the calendar and the heatmap', async () => {
    const me = await register();
    const habit = (await request(http).post('/api/habits').set(auth(me)).send({ name: 'Drink water' }).expect(201)).body;
    const today = new Date().toISOString().slice(0, 10);

    await request(http).post(`/api/habits/${habit.id}/events`).set(auth(me)).send({ date: today }).expect(201);
    await request(http).post(`/api/habits/${habit.id}/events`).set(auth(me)).send({ date: today }).expect(200); // already recorded
    await request(http).post(`/api/habits/${habit.id}/events`).set(auth(me)).send({ date: '2999-01-01' }).expect(422);

    const habits = await request(http).get(`/api/habits?from=${today}&to=${today}`).set(auth(me)).expect(200);
    expect(habits.body[0].completions).toEqual([today]);
    await request(http).get(`/api/habits/${habit.id}`).set(auth(me)).expect((r) => expect(r.body.totalCompletions).toBe(1));

    await request(http).post('/api/tasks').set(auth(me)).send({ title: 'Ship it', status: 'done' }).expect(201);

    const calendar = await request(http).get(`/api/calendar?from=${today}&to=${today}&tz=UTC`).set(auth(me)).expect(200);
    expect(calendar.body.events.map((e: any) => e.type).sort()).toEqual(['habit', 'task-done']);

    const heat = await request(http).get(`/api/stats/heatmap?from=${today}&to=${today}`).set(auth(me)).expect(200);
    expect(heat.body.days).toEqual([{ date: today, tasks: 1, habits: 1, total: 2, level: 4 }]);

    const completion = await request(http).get('/api/stats/completion?period=week&count=2').set(auth(me)).expect(200);
    expect(completion.body.items).toHaveLength(2);
    expect(completion.body.items[1]).toMatchObject({ completed: 1, workload: 1, rate: 1, habitCompletions: 1 });

    await request(http).delete(`/api/habits/${habit.id}/events/${today}`).set(auth(me)).expect(204);
    await request(http).delete(`/api/habits/${habit.id}/events/${today}`).set(auth(me)).expect(404);
    await request(http).delete(`/api/habits/${habit.id}`).set(auth(me)).expect(204);
  });

  it('refuses calendar periods that are too long or malformed', async () => {
    const me = await register();
    await request(http).get('/api/calendar?from=2026-01-01&to=2026-06-01').set(auth(me)).expect(422);
    await request(http).get('/api/calendar').set(auth(me)).expect(422);
  });
});

describe('notes and timers', () => {
  it('manages notes over REST', async () => {
    const me = await register();
    const note = (await request(http).post('/api/notes').set(auth(me)).send({ title: 'Ideas', content: 'one' }).expect(201)).body;
    expect(note).toMatchObject({ title: 'Ideas', content: 'one', version: 1 });
    const updated = await request(http).patch(`/api/notes/${note.id}`).set(auth(me)).send({ content: 'one two' }).expect(200);
    expect(updated.body).toMatchObject({ content: 'one two', version: 2 });
    expect((await request(http).get('/api/notes').set(auth(me)).expect(200)).body).toHaveLength(1);
    await request(http).delete(`/api/notes/${note.id}`).set(auth(me)).expect(204);
  });

  it('runs a shared timer through start, pause and reset', async () => {
    const me = await register();
    const timer = (await request(http).post('/api/timers').set(auth(me)).send({ label: 'Focus', durationSeconds: 1500 }).expect(201)).body;
    expect(timer).toMatchObject({ status: 'idle', durationMs: 1_500_000, remainingMs: 1_500_000 });
    await request(http).post('/api/timers').set(auth(me)).send({ label: 'x', durationSeconds: 0 }).expect(422);

    const act = (action: string) => request(http).post(`/api/timers/${timer.id}/action`).set(auth(me)).send({ action });
    expect((await act('start').expect(200)).body).toMatchObject({ status: 'running', startedAt: expect.any(String) });
    const paused = (await act('pause').expect(200)).body;
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBeLessThanOrEqual(1_500_000);
    expect((await act('reset').expect(200)).body).toMatchObject({ status: 'idle', remainingMs: 1_500_000 });
    await act('explode').expect(422);
  });
});

describe('workspaces', () => {
  it('shares tasks, notes and timers between members, and stops when they are removed', async () => {
    const [owner, guest, outsider] = [await register('Olive'), await register('Gus'), await register('Eve')];

    const ws = (await request(http).post('/api/workspaces').set(auth(owner)).send({ name: 'Team' }).expect(201)).body;
    expect(ws.members).toHaveLength(1);
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(guest)).send({ email: outsider.email }).expect(404); // guest is not in it yet
    const withGuest = (await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(201)).body;
    expect(withGuest.members.map((m: any) => m.email).sort()).toEqual([owner.email, guest.email].sort());
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(400); // already in
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(guest)).send({ email: outsider.email }).expect(403); // owner only

    const task = (await request(http).post('/api/tasks').set(auth(owner)).set('X-Workspace-Id', ws.id).send({ title: 'Shared', status: 'todo' }).expect(201)).body;
    const seenByGuest = await request(http).get('/api/tasks').set(auth(guest)).set('X-Workspace-Id', ws.id).expect(200);
    expect(seenByGuest.body.map((t: any) => t.id)).toEqual([task.id]);
    await request(http).get('/api/tasks').set(auth(outsider)).set('X-Workspace-Id', ws.id).expect(404);
    // It does not leak into the owner's personal workspace.
    expect((await request(http).get('/api/tasks').set(auth(owner)).expect(200)).body).toEqual([]);

    const personal = (await request(http).get('/api/workspaces').set(auth(owner)).expect(200)).body.find((w: any) => w.isPersonal);
    await request(http).post(`/api/workspaces/${personal.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(400);

    await request(http).delete(`/api/workspaces/${ws.id}/members/${owner.id}`).set(auth(owner)).expect(400); // owner cannot leave
    await request(http).delete(`/api/workspaces/${ws.id}/members/${guest.id}`).set(auth(guest)).expect(204); // guest leaves
    await request(http).get('/api/tasks').set(auth(guest)).set('X-Workspace-Id', ws.id).expect(404);
  });
});

describe('real-time sync over WebSockets', () => {
  it('refuses a socket without a valid token', async () => {
    const socket = io(url, { auth: { token: 'garbage' }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    const error = await nextEvent<Error>(socket, 'connect_error');
    expect(error.message).toBe('Could not validate credentials');
    expect(socket.connected).toBe(false);
  });

  it("pushes a member's task changes to the other devices of the workspace", async () => {
    const [owner, guest, outsider] = [await register('Olive'), await register('Gus'), await register('Eve')];
    const ws = (await request(http).post('/api/workspaces').set(auth(owner)).send({ name: 'Live' }).expect(201)).body;
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(201);

    const [guestPhone, guestLaptop, outsiderSocket] = [await connect(guest.token), await connect(guest.token), await connect(outsider.token)];
    const created = [nextEvent(guestPhone, 'task:created'), nextEvent(guestLaptop, 'task:created')];
    const quiet = silentFor(outsiderSocket, 'task:created');

    const task = (await request(http).post('/api/tasks').set(auth(owner)).set('X-Workspace-Id', ws.id).send({ title: 'Live task', status: 'todo' }).expect(201)).body;
    const [onPhone, onLaptop] = await Promise.all(created);
    expect(onPhone).toMatchObject({ id: task.id, title: 'Live task', workspaceId: ws.id });
    expect(onLaptop.id).toBe(task.id);
    expect(await quiet).toBe(true);

    const updated = nextEvent(guestPhone, 'task:updated');
    await request(http).patch(`/api/tasks/${task.id}`).set(auth(owner)).set('X-Workspace-Id', ws.id).send({ status: 'done' }).expect(200);
    expect((await updated).status).toBe('done');

    const deleted = nextEvent(guestLaptop, 'task:deleted');
    await request(http).delete(`/api/tasks/${task.id}`).set(auth(owner)).set('X-Workspace-Id', ws.id).expect(204);
    expect(await deleted).toEqual({ id: task.id });
  });

  it('a user added to a workspace starts receiving its events without reconnecting', async () => {
    const [owner, guest] = [await register('Olive'), await register('Gus')];
    const ws = (await request(http).post('/api/workspaces').set(auth(owner)).send({ name: 'Late' }).expect(201)).body;
    const guestSocket = await connect(guest.token);

    const invited = nextEvent(guestSocket, 'workspace:updated');
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(201);
    expect(await invited).toEqual({ id: ws.id });

    const created = nextEvent(guestSocket, 'note:created');
    await request(http).post('/api/notes').set(auth(owner)).set('X-Workspace-Id', ws.id).send({ title: 'Welcome' }).expect(201);
    expect((await created).title).toBe('Welcome');
  });

  it('syncs live note edits sent over the socket, saves them, and acknowledges the sender', async () => {
    const [owner, guest] = [await register('Olive'), await register('Gus')];
    const ws = (await request(http).post('/api/workspaces').set(auth(owner)).send({ name: 'Notes' }).expect(201)).body;
    await request(http).post(`/api/workspaces/${ws.id}/members`).set(auth(owner)).send({ email: guest.email }).expect(201);
    const note = (await request(http).post('/api/notes').set(auth(owner)).set('X-Workspace-Id', ws.id).send({ title: 'Plan' }).expect(201)).body;

    const [ownerSocket, guestSocket] = [await connect(owner.token), await connect(guest.token)];
    const seen = nextEvent(ownerSocket, 'note:updated');
    const ack = await guestSocket.timeout(3000).emitWithAck('note:edit', { id: note.id, workspaceId: ws.id, content: 'typed on the phone' });

    expect(ack).toMatchObject({ ok: true, note: { id: note.id, content: 'typed on the phone', version: 2, updatedById: guest.id } });
    expect(await seen).toMatchObject({ id: note.id, content: 'typed on the phone', updatedById: guest.id });

    // Persisted: a fresh REST read returns the socket edit.
    const stored = await request(http).get('/api/notes').set(auth(owner)).set('X-Workspace-Id', ws.id).expect(200);
    expect(stored.body[0].content).toBe('typed on the phone');

    // An outsider cannot edit through the socket.
    const outsider = await register('Eve');
    const outsiderSocket = await connect(outsider.token);
    const refused = await outsiderSocket.timeout(3000).emitWithAck('note:edit', { id: note.id, workspaceId: ws.id, content: 'hax' });
    expect(refused).toEqual({ ok: false, detail: 'Workspace not found' });
  });

  it('sends a timer state change to every device so each can compute the countdown', async () => {
    const me = await register();
    const [phone, laptop] = [await connect(me.token), await connect(me.token)];
    const timer = (await request(http).post('/api/timers').set(auth(me)).send({ label: 'Pomodoro', durationSeconds: 60 }).expect(201)).body;

    const onLaptop = nextEvent(laptop, 'timer:updated');
    await request(http).post(`/api/timers/${timer.id}/action`).set(auth(me)).send({ action: 'start' }).expect(200);
    expect(await onLaptop).toMatchObject({ id: timer.id, status: 'running', serverTime: expect.any(String) });
    expect(phone.connected).toBe(true);
  });

  it('keeps habits private: only the owner devices hear about them', async () => {
    const [a, b] = [await register('Ann'), await register('Bob')];
    const [annDevice, bobDevice] = [await connect(a.token), await connect(b.token)];
    const heard = nextEvent(annDevice, 'habit:changed');
    const silent = silentFor(bobDevice, 'habit:changed');
    await request(http).post('/api/habits').set(auth(a)).send({ name: 'Read' }).expect(201);
    await heard;
    expect(await silent).toBe(true);
  });
});
