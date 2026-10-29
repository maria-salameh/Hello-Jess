# HelloJess

HelloJess is a **real-time shared workspace**: to-dos, notes, timers, a calendar, habits and statistics. Everything lives in a *workspace* (yours alone, or shared with other people by email) and changes show up instantly on every open device, with no refresh.

It is built as three pieces sharing one backend: a **NestJS API** (PostgreSQL, WebSockets), a **React web app** and a **React Native (Expo) mobile app**. The task, habit, calendar and statistics features started as the **TaskFlow** subject, with all four bonuses.

```
React web app ──HTTP + WebSocket──> NestJS (REST + socket.io gateway) ──> PostgreSQL
React Native app ──HTTP──────────────^
```

## Screenshots

### Web app

| Tasks: filters, counter, overdue tasks | Task detail and edit |
| --- | --- |
| ![Tasks](docs/tasks.png) | ![Task detail](docs/task-detail.png) |

| Validation messages | Calendar |
| --- | --- |
| ![Validation error on an empty title](docs/validation.png) | ![Calendar](docs/calendar.png) |

| Habits | Statistics: heatmap and completion rate |
| --- | --- |
| ![Habits](docs/habits.png) | ![Statistics](docs/statistics.png) |

| Profile (click the user at the top right) |
| --- |
| ![Profile](docs/profile.png) |

### Mobile app (React Native / Expo)

<table>
  <tr>
    <th>Tasks</th>
    <th>Calendar</th>
    <th>Habits</th>
    <th>Statistics</th>
    <th>Profile</th>
  </tr>
  <tr>
    <td><img src="docs/mobile-tasks.png" alt="Mobile tasks" width="170"></td>
    <td><img src="docs/mobile-calendar.png" alt="Mobile calendar" width="170"></td>
    <td><img src="docs/mobile-habits.png" alt="Mobile habits" width="170"></td>
    <td><img src="docs/mobile-statistics.png" alt="Mobile statistics" width="170"></td>
    <td><img src="docs/mobile-profile.png" alt="Mobile profile" width="170"></td>
  </tr>
</table>

## What is implemented

**Mandatory part (MVP)** — registration/login, list of your own tasks, add, detail, edit and delete, validation with clear error messages, persistent storage (PostgreSQL), and authorization enforced by the API (you can never read or change someone else's task).

**Bonuses**

| Bonus | Feature |
| --- | --- |
| **B1** | `priority` field (`low`, `medium`, `high`), filters by status, priority and due date (overdue / today / next 7 days / no date), and a task counter per status |
| **B2** | Second entity **`Habit`** with dated completion events (one per habit per day). A habit is recurring; a one-off task that is checked off is not a habit |
| **B3** | GitHub-style **heatmap**: daily aggregation of completed tasks and habit completions, calendar grid, legend, days with no activity shown, time zones handled |
| **B4** | **Statistics**: weekly (or monthly) completion rate, evolution versus the previous period, with documented and unit-tested calculations |

**Extra** — a **calendar** page (web and mobile): a month grid with a colour per kind of event, and the selected day's events listed below.

- Open tasks appear on their due date, or on the day they were added when they have no due date, so a new task always shows up.
- Tasks are coloured by status: **to do** purple, **doing** orange, **done** green (shown on the day they were completed). **Habits** are blue.
- A task whose due date has passed keeps its status colour with a **red outline**. Overdue tasks that are due before the visible grid (for example last month) are carried onto today, so they are never hidden.

**Profile** — the logged-in user's name and email are always shown at the top of every screen (web and mobile). Clicking or tapping them opens a **profile page** with the account details (name, email, member since, user ID) and a summary of the account's activity (tasks by status, habits). From there you can **edit your name and email**: the header updates immediately, an email that is invalid or already used is refused with a clear message, and you keep your tasks and habits.

## Real time

Every change is saved to PostgreSQL first, then pushed to the other devices through a **socket.io gateway** on the same server.

- A client connects with its login token (`io(url, { auth: { token } })`). A bad token is refused (`connect_error`). The server puts the connection in a room for the user and one room per workspace they belong to.
- Task, note and timer changes go to the workspace room (`task:created|updated|deleted`, `note:…`, `timer:…`); habits are private and only go to the owner's own devices (`habit:changed`). Someone added to a workspace starts receiving its events without reconnecting.
- **Notes** are edited live over the socket: `socket.emit("note:edit", { id, title?, content? }, ack)` validates and saves the edit, broadcasts `note:updated` and acknowledges the sender. Edits are last-write-wins (each save bumps `version`).
- **Timers** store only a state and the instant it changed; each device computes the countdown itself (corrected with the server's clock), so nothing is pushed every second.
- After a connection drop the web app reloads what it may have missed.

## Workspaces

Everyone gets a **personal** workspace at registration. You can create **shared** ones and invite people who already have an account (`POST /api/workspaces/:id/members { email }`); only the owner invites or removes, and members can leave. Tasks, notes, timers, the calendar and the statistics belong to a workspace; **habits stay private to you**. Choose the workspace with the `X-Workspace-Id` header (the web app has a switcher); without it the personal workspace is used, which keeps the mobile app working unchanged.

## Structure

- `backend/` — NestJS + TypeScript, TypeORM + PostgreSQL, socket.io, JWT auth, zod validation, Jest tests
- `web/` — React + TypeScript (Vite), Vitest tests
- `mobile/` — React Native (Expo) for iOS/Android (uses the personal workspace; it does not receive live updates)
- `k8s/` — Kubernetes manifests (Kustomize)
- `.github/workflows/ci-cd.yml` — test, build, push and deploy pipeline
- `docker-compose.yml` — the whole stack locally

Backend layout (`backend/src`), one Nest module per feature: `auth`, `users`, `workspaces`, `tasks`, `habits`, `stats`, `calendar`, `notes`, `timers` and `realtime` (the gateway). Each has its entities, zod schemas, service and controller. The calculations (`stats.calculations.ts`, `calendar.events.ts`, `timer.logic.ts`) are pure functions with no database. `common/` holds the date utilities, validation pipe and error filter. Specs sit next to the code; end-to-end specs are in `backend/test`.

## Run everything with Docker

```bash
docker compose up --build
```

Open http://localhost:8080 (the web container proxies `/api` and `/socket.io` to the backend; PostgreSQL runs in its own container with a volume).

## Running the backend

```bash
cd backend
npm install
cp .env.example .env     # then edit DATABASE_URL
npm run dev
```

Requires Node 22+ and a PostgreSQL server (for example `docker run -p 5432:5432 -e POSTGRES_USER=hellojess -e POSTGRES_PASSWORD=hellojess -e POSTGRES_DB=hellojess postgres:17-alpine`). The server listens on `0.0.0.0:8000` so phones on the same Wi-Fi can reach it.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Port the API listens on |
| `DATABASE_URL` | `postgres://hellojess:hellojess@localhost:5432/hellojess` | PostgreSQL connection string |
| `CORS_ORIGIN` | `*` | Allowed browser origin(s) |
| `SECRET_KEY` | dev placeholder | Secret used to sign login tokens — change it outside local development |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Lifetime of a login token |
| `DB_SYNCHRONIZE` | `true` | Creates and updates the tables from the entities at start-up. There are no migrations yet |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | empty | Mail server for the 6-digit codes sent at sign-up and login. With no `SMTP_HOST` the code is printed in the backend log instead |
| `MOBILE_TOKEN_EXPIRE_DAYS` | `30` | How long the phone app stays logged in before asking for the password and a new code |

### Tests

```bash
cd backend
npm test            # Jest unit specs
npm run test:e2e    # Jest end-to-end specs: real PostgreSQL, real WebSocket clients
```

The **unit specs** (84 tests) cover the date utilities, the validation rules of every field, the password hashing and login tokens, the heatmap, completion-rate and calendar calculations, the timer state machine, the task service rules, the note-editing gateway and the error shapes. The **end-to-end specs** (18 tests) boot the real app and check the full flows over HTTP and sockets: accounts, tasks and their filters, privacy between users, workspaces and invitations, habits feeding the calendar and statistics, notes, timers, and that changes reach the other devices of a workspace (and not outsiders). They need no setup: when `TEST_DATABASE_URL` is not set, a throwaway PostgreSQL is started with the `embedded-postgres` package and removed afterwards (CI uses a PostgreSQL service container instead).

```bash
cd web
npm test            # Vitest + Testing Library
```

The **web specs** (43 tests) cover the API client (error messages, auth and workspace headers), the live-refresh hook, the workspace/socket context (reconnects, removals), the date and timer utilities, the task item, and the Tasks and Timers pages reacting to pushed events.

## CI/CD and deployment

`.github/workflows/ci-cd.yml` runs on every push and pull request: backend build, unit and end-to-end tests (with a PostgreSQL service container), web lint, tests and build. On pushes to `main`, once the tests pass, it builds the two Docker images, pushes them to GitHub Container Registry tagged with the commit, applies `k8s/` and waits for the rollout of the new tags, rolling back if it does not become healthy. See [k8s/README.md](k8s/README.md) for the manifests and first-time setup.

Repository secrets used by the deploy job: `KUBE_CONFIG` (base64 kubeconfig), `POSTGRES_PASSWORD` (URL-safe) and `SECRET_KEY`. The cluster must be able to pull the images from `ghcr.io` (make the packages public or add an image pull secret).

## The `Task` model

| Field | Rule | Required on `POST` |
| --- | --- | --- |
| `title` | String, trimmed, 1 to 120 characters | Yes |
| `status` | Exactly `todo`, `doing` or `done` | Yes |
| `description` | String of 0 to 1000 characters (empty string accepted) | No |
| `dueDate` | A real calendar date `YYYY-MM-DD` (`2026-02-30` is refused), or `null` | No |
| `priority` | `low`, `medium` (default) or `high` — bonus B1 | No |
| `completedAt` | Set by the server when the status becomes `done`, cleared when it leaves `done` | Never (read-only) |
| `id`, `createdAt`, `updatedAt` | Set by the server | Never |

`dueDate` is a plain calendar day (no time, no time zone), so it never shifts depending on where you are.

## API

All routes except register, login and `/health` need the header `Authorization: Bearer <token>` (returned by register/login). The web and mobile apps add the `/api` prefix themselves, so their `VITE_API_URL` / `EXPO_PUBLIC_API_URL` stay as the plain server address.

| Method and path | What it does |
| --- | --- |
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | Account (login takes a JSON body `{ email, password }`) |
| `PATCH /api/auth/me` | Edit your profile: `{ name?, email? }` (only the fields sent change). Returns the updated user and a fresh token; `400` if the email is already used, `422` if a value is invalid |
| `GET /api/tasks` | The tasks of the workspace. Optional filters: `status`, `priority`, `dueFrom`, `dueTo` (inclusive), `noDueDate=true` |
| `GET /api/tasks/count` | Counter: `{ total, todo, doing, done }` |
| `POST /api/tasks` · `GET /api/tasks/:id` · `PATCH /api/tasks/:id` · `DELETE /api/tasks/:id` | Create, detail, edit (only the fields sent change), delete |
| `GET /api/habits` · `POST /api/habits` · `GET`/`PATCH`/`DELETE /api/habits/:id` | Habits (`?from=&to=` adds the days each one was done). Deleting a habit deletes its events |
| `GET /api/habits/:id/events` · `POST /api/habits/:id/events` · `DELETE /api/habits/:id/events/:date` | Dated completions (`{ "date": "2026-10-05" }`, one per habit per day) |
| `GET /api/calendar?from=&to=&tz=` | Calendar events for a period (at most 62 days): open tasks (with their `status`), overdue tasks carried onto today, completed tasks and habit completions |
| `GET /api/stats/heatmap?from=&to=&tz=` | Heatmap data (default: the last 52 weeks, at most 366 days) |
| `GET /api/stats/completion?period=week\|month&count=12&tz=` | Completion rate per period |
| `GET /api/workspaces` · `POST /api/workspaces` | Your workspaces with their members; create a shared one `{ name }` |
| `POST /api/workspaces/:id/members` · `DELETE /api/workspaces/:id/members/:userId` | Invite by email (owner only); remove a member or leave |
| `GET /api/notes` · `POST /api/notes` · `PATCH /api/notes/:id` · `DELETE /api/notes/:id` | Shared notes (live edits also go over the socket, see Real time) |
| `GET /api/timers` · `POST /api/timers` · `POST /api/timers/:id/action` · `DELETE /api/timers/:id` | Shared timers `{ label, durationSeconds }`; the action body is `{ "action": "start" \| "pause" \| "reset" }` |
| `GET /health` | Is the server up? (also checks the database) |

**Errors.** Invalid input gets a `422` with one message per field, for example `{ "detail": "Validation failed", "errors": [{ "field": "title", "message": "title must not be empty" }] }`. Other errors use `{ "detail": "..." }`: `400` (email already registered), `401` (not logged in or bad credentials), `404` (not found), `500`. The web and mobile apps show these messages.

**Authorization.** Every query is scoped to the logged-in user's workspace (or, for habits, to the user). Membership is checked on every request and every socket message, and data that belongs to someone else behaves exactly like data that does not exist (`404`).

## Statistics: how they are calculated

Everything is computed on **calendar days in the user's time zone** (`tz`, e.g. `Europe/Paris`, sent automatically by the apps; default `UTC`). A task completed at 23:30 UTC on 1 March counts for 2 March in Paris but for 1 March in New York. Habit events already store the user's own calendar day. Weeks run Monday to Sunday and months are calendar months. Daylight-saving days (23 or 25 hours) are handled by converting each instant to a calendar day instead of doing arithmetic on hours.

The statistics cover the tasks of the workspace being viewed plus your own habits.

**Heatmap (B3).** One entry per day of the period, **including days with no activity**: `tasks` (tasks completed that day), `habits` (habit completions that day), `total`, and a `level` from 0 to 4 (`0` when `total` is 0, otherwise `ceil(total / max × 4)`, where `max` is the busiest day of the period). The clients draw the grid, the month labels, the legend and a tooltip per day.

**Completion rate (B4).** For each period:

- **completed** = tasks whose completion day falls in the period
- **workload** = tasks "in play" during the period: created on or before its last day, and not completed before its first day
- **rate** = completed ÷ workload, between 0 and 1 — or `null` (not 0) when the workload is 0, because a rate cannot be measured on zero tasks
- **change** = rate minus the previous period's rate (`null` if either is `null`)

Example: a task created before the week and finished during it counts in both `completed` and `workload`; a task created later in the week and still open counts only in `workload`. Known limitation: reopening a completed task clears its completion date, so it no longer counts as completed in the past.

## Running the web app

```bash
cd web
npm run dev
```

Opens at http://localhost:5173. Uses `web/.env` → `VITE_API_URL` to find the backend (see `web/.env.example`; leave it empty to use the same origin, as the Docker image does). Run the tests with `npm test`.

## Running the mobile app

```bash
cd mobile
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) to run it on your phone, or press `a`/`i` for an emulator.

Uses `mobile/.env` → `EXPO_PUBLIC_API_URL`, currently set to `http://192.168.1.250:8000` (your machine's LAN IP). **If your IP changes or you're on a different network, update this file** — a phone can't reach `localhost`, it needs your computer's actual LAN address. Find it with `ipconfig` (look for "IPv4 Address").

For the Android emulator specifically, `http://10.0.2.2:8000` also works instead of the LAN IP.

## Accounts / auth

Register creates an account and logs you in immediately (JWT stored in browser localStorage on web, AsyncStorage on mobile). The token identifies the user by their id, not their email, so changing your email never logs you out of anything. Habits are private to the user; tasks, notes, timers, the calendar and the statistics belong to the workspace being viewed.
