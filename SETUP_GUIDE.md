# OfficeFlow — Setup & How It Works

OfficeFlow is an internal office **expense management** web app. Employees submit their own expenses; the admin reviews, settles and manages everything else. It also tracks the monthly company budget and an employee fund, and celebrates employee birthdays with in-app animations and push notifications.

This guide covers setup, configuration, how each part works, and deployment.

---

## Contents

1. [Tech stack](#1-tech-stack)
2. [Requirements](#2-requirements)
3. [Quick start (local)](#3-quick-start-local)
4. [Environment variables](#4-environment-variables)
5. [Database (Neon Postgres)](#5-database-neon-postgres)
6. [Roles & permissions](#6-roles--permissions)
7. [Features & how they work](#7-features--how-they-work)
8. [Theme, design & motion](#8-theme-design--motion)
9. [Birthday celebrations & push notifications](#9-birthday-celebrations--push-notifications)
10. [Keeping the database awake](#10-keeping-the-database-awake)
11. [Hidden modules (Leave & Trips)](#11-hidden-modules-leave--trips)
12. [Deployment (Vercel)](#12-deployment-vercel)
13. [Scripts & testing](#13-scripts--testing)
14. [Project structure](#14-project-structure)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 with design tokens (CSS variables) for light/dark themes |
| Animation | Framer Motion + the browser View Transitions API (theme switch) |
| Database | PostgreSQL on **Neon** (serverless), accessed through **Prisma 7** with the Neon adapter over WebSockets (`ws`) |
| Data fetching | TanStack Query |
| Forms & validation | React Hook Form + Zod |
| Auth | Custom JWT auth (`jose`) in httpOnly cookies, bcrypt password hashes, rotating refresh tokens |
| Email | Nodemailer over SMTP (invites, temporary passwords) |
| Push notifications | Web Push (VAPID) via `web-push` + a service worker |
| Exports | Server-side Excel (`xlsx`) |
| Hosting | Vercel (recommended), with Vercel Cron for the daily birthday job |

---

## 2. Requirements

- **Node.js 22 or newer** (the project is developed on Node 24).
- **npm** (comes with Node).
- A free **Neon** account: <https://neon.tech>
- An **SMTP** mailbox for invite and password emails (for example a Gmail app password, Brevo, Resend SMTP or Mailgun).
- Optional: **Microsoft Edge or Chrome** installed, for the browser UI tests.

---

## 3. Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root (see section 4)

# 3. Generate the Prisma client
npx prisma generate

# 4. Create the database tables
npx prisma migrate deploy        # or: npx prisma migrate dev  (development)

# 5. Create the admin account (safe to re-run; never deletes anything)
npm run db:seed

# 6. Start the app
npm run dev
```

Open **<http://localhost:3001>**. The root URL shows the login page directly.

### First login

`npm run db:seed` creates **one admin account** (and the employee fund record) if it doesn't exist yet:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@officeflow.local` | `Password123!` |

- No demo employees or sample data are created, and existing data is never deleted or changed. Running it again is safe.
- Override the defaults with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME` and `SEED_ADMIN_PASSWORD` in `.env` before seeding.
- **Change the admin password** after the first login (account menu → Change password).
- Add your team from **Users → Create user** or **Invite user**.

---

## 4. Environment variables

All variables go in `.env` in the project root. `.env` is git-ignored; **never commit it**.
The app validates the variables at startup (`src/lib/env.ts`) and refuses to start if a required one is missing or invalid.

### Required

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://…-pooler…/neondb?sslmode=require&channel_binding=require` | **Pooled** Neon connection, used by the running app |
| `DIRECT_URL` | same URL **without** `-pooler` in the host | **Direct** Neon connection, used by Prisma CLI (migrations) |
| `JWT_ACCESS_SECRET` | 48+ random characters | Signs short-lived access tokens |
| `JWT_REFRESH_SECRET` | 48+ random characters (different from the access secret) | Signs refresh tokens |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifetime |
| `APP_URL` | `http://localhost:3001` (local) / `https://your-app.vercel.app` | Used in invite email links |
| `CRON_SECRET` | 32+ random characters | Protects `/api/cron/birthday-fund` |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP server |
| `MAIL_PORT` | `465` or `587` | SMTP port |
| `MAIL_SECURE` | `true` for 465, `false` for 587 | Use implicit TLS |
| `MAIL_USER` | `you@company.com` | SMTP username |
| `MAIL_PASS` | app password | SMTP password |
| `MAIL_FROM` | `noreply@company.com` | Sender address |

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `OfficeFlow` | Display name |
| `APP_TIMEZONE` | `Asia/Kolkata` | Office timezone for birthdays and office hours |
| `NEXT_PUBLIC_FEATURE_LEAVE` | `false` | `true` shows the Leave module |
| `NEXT_PUBLIC_FEATURE_TRIPS` | `false` | `true` shows the Trips module |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | Web push public key (push is disabled if missing) |
| `VAPID_PRIVATE_KEY` | — | Web push private key (**secret**) |
| `VAPID_SUBJECT` | `mailto:admin@officeflow.local` | Contact for push services |
| `OFFICE_HOURS` | `10:00-20:00` | Window when the DB is kept fully awake |
| `OFFICE_DAYS` | `1-5` | Office days (`0`=Sun … `6`=Sat), e.g. `1-5` or `1,2,3,4,5` |
| `OFF_HOURS_WARM_INTERVAL_MINUTES` | `30` | Off-hours: wake the DB every N minutes (`0` = let it sleep) |
| `KEEP_WARM_PING_MINUTES` | `4` | Must match how often your external pinger calls `/api/keep-warm` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | — | Shared login rate limiting (recommended in production) |
| `NEXT_PUBLIC_QUERY_DEVTOOLS` | — | `true` shows the TanStack Query devtools |

> `NEXT_PUBLIC_*` values are built into the browser bundle, so **restart the dev server or redeploy** after changing them.

Not currently used by the app, but safe to keep for future features:
`AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (Neon object storage, for example future receipt uploads) and `NEON_AUTH_URL` (OfficeFlow uses its own auth).

---

## 5. Database (Neon Postgres)

### Get the connection strings
1. Create a project in the Neon console.
2. Open **Connect** → copy the **pooled** connection string → `DATABASE_URL`.
3. Copy the **direct** connection string (host without `-pooler`) → `DIRECT_URL`.

### Schema and migrations
- The schema lives in `prisma/schema.prisma`; migrations live in `prisma/migrations/`.
- `prisma.config.ts` loads `.env` and uses `DIRECT_URL` for CLI commands.
- Apply migrations with `npx prisma migrate deploy`. Create a new one during development with `npx prisma migrate dev --name <change>`.

Main tables:

| Table | Purpose |
|---|---|
| `User` | People, role (Admin/Employee), birthday, active flag |
| `RefreshToken` | Hashed, rotating refresh tokens |
| `Expense` | Expense records (type `FOOD`/`OTHER`/`TRIP`, amount, date, settled/archived state) |
| `ExpenseSettlement` | One row per employee per month when settled, with a JSON history |
| `MonthlyBudget` | Budget amount + `effectiveFrom` date (the latest one already in effect is "current") |
| `EmployeeFund`, `EmployeeFundContribution`, `EmployeeFundAdjustment` | Employee fund balance, yearly birthday contributions, manual adjustments |
| `UserInvite` | Hashed invite tokens |
| `PushSubscription` | Browser push subscriptions per user/device |
| `AuditLog` | Sensitive action history |
| `Leave*`, `Trip*` | Kept for the hidden Leave and Trips modules |

### Why Postgres (and not MongoDB)
The data is relational: users → expenses → monthly settlements, plus budgets and the employee fund. Money uses exact `Decimal` fields, and there are uniqueness rules such as one settlement per employee per month. Postgres with transactions fits this well. Prisma 7 also does not support MongoDB yet. Neon's free tier covers this app's needs.

### Connection notes
- The app connects through Prisma's Neon adapter using the `ws` WebSocket library with a 30-second connection timeout (`src/lib/db/prisma.ts`).
- If the database is briefly unreachable, API routes return **503 "temporarily unavailable"** instead of signing the user out. The login form shows a retryable error.
- `passwordHash` is **never** returned by queries. Prisma omits it globally; only login and change-password read it explicitly.

---

## 6. Roles & permissions

There are only two roles, with **no manager/team hierarchy**. The **Admin** does all administrative work; **Employees** work only with their own data.

| Capability | Employee | Admin |
|---|:-:|:-:|
| Dashboard | Own data | Everyone ("Team" / "Only me" toggle) |
| Submit / edit own unsettled expenses | ✅ | ✅ |
| Archive own unsettled expense | ✅ | ✅ (any) |
| Settle / unsettle expenses, settle a whole month | — | ✅ |
| View / restore archived expenses, filter by employee | — | ✅ |
| Excel export | Own | All |
| View budget & own employee-fund balance | ✅ | ✅ |
| Budget history, fund adjustment history | — | ✅ |
| Set monthly budget, adjust employee fund | — | ✅ |
| Users page: create/invite users, change roles, reset passwords, deactivate | — | ✅ |
| Audit logs | — | ✅ |

- The server enforces these rules in the API routes (`requireRole`) and the service layer; employees can't see other people's data even by editing request parameters. Hiding a button is never the only protection.
- The old **Manager** role still exists in the database enum (for compatibility) but is no longer used or offered. Any user still stored as Manager is treated as an **Employee**.
- The admin cannot remove their own admin access or deactivate their own account, so you can't lock yourself out.

---

## 7. Features & how they work

### Sign-in flow
- `/` **is the login page.** Signed-in users who open `/` or `/login` are redirected to `/dashboard`.
- On login the server sets two **httpOnly cookies**: a short-lived access token and a refresh token (stored hashed, rotated on use).
- If an account was created with a temporary password (`mustChangePassword`), the user goes to `/change-password` first. The session is updated immediately after the change.
- The proxy (`src/proxy.ts`) protects all app pages. Unauthenticated visitors are sent to `/`.
- Login attempts are rate-limited: 10 per 10 minutes per email. The limit is kept in memory, or in Upstash Redis if configured.
- **Sign out** is in the account menu (top-right avatar).

### Navigation (where things are)
- **Sidebar**, grouped into:
  - **Overview:** Dashboard
  - **Finance:** Expenses, Budget & fund
  - **Administration:** Users, Audit logs (depending on role)
  - **Account:** Profile
- The sidebar can be **collapsed** to icons (button at the bottom); the choice is remembered in a cookie.
- **Top bar:**
  - Breadcrumb showing where you are
  - **Create expense** button, which opens the new-expense form directly (`/expenses?new=1`)
  - Theme toggle and notification bell
  - Account menu with Profile & notifications, Change password and Sign out
- On mobile the sidebar becomes a slide-in drawer.

### Dashboard
- Summary cards: total submitted, awaiting settlement, settled, and % of this month's budget used.
- Food spending by quarter (bar chart), monthly budget progress, employee fund balances, quick actions.
- The first view is rendered on the server with data already in place, so there's no loading flash. Counters, chart bars and lists animate in smoothly.
- The admin can switch between **Team** (everyone) and **Only me**; employees always see their own data.

### Expenses
- Everyone: create, edit and archive their own unsettled expenses, and filter by type, settlement status, dates, amount and search.
- Admin only: settle/unsettle (single, selected or a whole month), view and restore archived expenses, and filter by employee.
- **Settle Month** (admin) previews and settles all eligible expenses in a month.
- **Export Excel** downloads the filtered list.
- Only `FOOD` and `OTHER` expenses count toward the company budget.

### Budget & employee fund
- **Monthly budget:** an admin sets an amount with an effective date. The current budget is the latest one whose date has already started, so a budget scheduled for next month doesn't affect today.
- **Employee fund:** each employee receives a yearly contribution on their birthday (once per year, via the daily cron job), plus any manual adjustments by an admin.

### Users
- Create a user with a temporary password (emailed), or send an **invite link** (the person sets their own password at `/accept-invite`).
- Only the admin sees the Users page. The admin can change a person's role (Admin or Employee), reset passwords and deactivate or reactivate accounts.

### Audit logs
Logins, password changes, user changes, budget changes, fund adjustments, settlements and archive/restore actions are recorded. Admins can review them.

### Profile
Shows the user's details, a Change password shortcut, and the **push notification** switch with a "Send test" button.

---

## 8. Theme, design & motion

- **Light and dark themes** with a Jira-like, clean workspace look. The font is **Inter**, with tabular numbers for amounts.
- Toggle with the **sun/moon button** (top bar, and top-right of the login page).
  - Switching uses a **circular reveal** from the button (View Transitions API), with a rotating icon.
  - Browsers without View Transitions get a smooth colour fade instead.
- **First visit:** follows the operating-system setting. After that, the user's choice is saved in `localStorage` (`officeflow-theme`).
- A small inline script in `<head>` applies the theme **before the first paint**, so it never flashes the wrong theme.
- **How dark mode is implemented:**
  - Design tokens (`--background`, `--surface`, `--primary`, `--border`, …) are defined in `src/app/globals.css`.
  - Under `html[data-theme="dark"]` the Tailwind palette variables (`slate`, `white`, `indigo`, `emerald`, `amber`, `rose`, …) are remapped, so every screen adapts automatically.
- **Motion:**
  - Page transitions, and the sliding active-item highlight in the sidebar.
  - Sidebar collapse, and staggered card entrances.
  - Count-up numbers, animated chart bars and progress bars.
  - Dialog and menu transitions, and table rows animating in.
- Everything respects the user's **"reduce motion"** operating-system setting.

---

## 9. Birthday celebrations & push notifications

### In-app celebration
Birthdays are compared in `APP_TIMEZONE`. Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
- **The birthday person** sees a full-screen celebration once per day: confetti, balloons and an animated greeting.
- **Everyone else** sees a dismissible banner: *"Today is <name>'s birthday"*.

**To try it:** set a user's birthday (Users page) to today's date and sign in as that user.

### Push notifications (Web Push)
1. Generate VAPID keys once and add them to `.env`:
   ```bash
   npx web-push generate-vapid-keys
   ```
   → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
2. Users turn notifications on with the **bell** in the top bar or on **Profile**. The browser asks for permission.
3. The service worker `public/sw.js` receives pushes and opens the app when a notification is clicked.
4. The daily job **`/api/cron/birthday-fund`** runs at 04:00 UTC (09:30 IST, see `vercel.json`). It:
   - adds the yearly employee-fund birthday contribution,
   - sends a "Happy Birthday" push to the birthday person,
   - sends a team push to everyone else who has notifications on.

**Limits:**
- Push requires **HTTPS**, except on `localhost`.
- On **iPhone/iPad**, users must first *Add to Home Screen*.
- Expired subscriptions are cleaned up automatically.

Call the cron job manually (useful for testing):

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://your-app/api/cron/birthday-fund
```

---

## 10. Keeping the database awake

Neon's free plan puts the database to sleep after **5 minutes idle**. The first query afterwards wakes it, which adds a short delay. Nothing is lost; it is not "closed".

OfficeFlow reduces this delay in two ways:

1. **Login pre-warm:** the login page calls `/api/health` as soon as it opens, and again when an idle tab is refocused. The database is awake by the time the password is typed.
2. **Scheduled keep-warm:** point an external pinger (cron-job.org, UptimeRobot or your own site) at:
   ```
   GET https://your-app/api/keep-warm      every 4 minutes, 24/7
   ```
   The app decides what to do with each ping:

   | Time (in `APP_TIMEZONE`) | Behaviour |
   |---|---|
   | Office hours (`10:00-20:00`, Mon–Fri) | DB kept fully awake |
   | Nights & weekends | DB woken every 30 minutes (`OFF_HOURS_WARM_INTERVAL_MINUTES`) |

**Estimated monthly usage** at the smallest compute size: about 55 compute-hours during office hours plus about 21 off-hours, **≈ 76 of the 100 free compute-hours**.
- Use **4 minutes**, not 5, for the pinger interval, or the database can fall asleep between pings.
- Don't set the off-hours interval below about 30 minutes, or you risk hitting the monthly limit. Neon then suspends the database until the next billing cycle.
- Keeping the database awake 24/7 needs a paid Neon plan.

`/api/health` always returns the database status and latency, so you can also use it for uptime monitoring.

---

## 11. Hidden modules (Leave & Trips)

The **Leave** and **Trips** modules still exist in the code and database but are **hidden from everyone** by default.

When a module is hidden:
- Its menu item and its dashboard and Expenses elements disappear.
- Its pages redirect to `/dashboard`.
- Its APIs (and Excel exports) return **404**.

To bring a module back, set its flag in `.env` and restart or redeploy:

```env
NEXT_PUBLIC_FEATURE_LEAVE=true
NEXT_PUBLIC_FEATURE_TRIPS=true
```

The flags are defined in `src/lib/features.ts`.

---

## 12. Deployment (Vercel)

1. Push the code to a Git repository and import it in Vercel.
2. Add **all required environment variables** (section 4) in *Project → Settings → Environment Variables*. Set `APP_URL` to your production URL.
3. Build command: `npm run build` (the default). Vercel runs `prisma generate` through the Prisma package.
4. Apply migrations to the production database before or after the first deploy:
   ```bash
   npx prisma migrate deploy
   ```
5. **Cron:** `vercel.json` schedules `/api/cron/birthday-fund` daily. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set as an env var.
6. **Keep-warm:** Vercel's free plan only runs cron jobs once a day, so use an external pinger for `/api/keep-warm` (section 10).
7. Recommended for production:
   - Set `UPSTASH_REDIS_REST_URL`/`TOKEN` so login rate limiting is shared across server instances.
   - Change or remove the demo accounts.
   - Use strong, unique secrets.

---

## 13. Scripts & testing

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on port 3001 |
| `npm run build` / `npm start` | Production build / serve it on port 3001 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checks |
| `npm test` | Unit tests for business rules (expenses, settlements, birthdays, office-hours keep-warm) |
| `npm run test:ui` | Browser tests (Playwright): root login, redirects after login, error handling, mobile layout. **Start `npm run dev` first.** Uses Microsoft Edge by default; set `PLAYWRIGHT_CHANNEL=chrome` for Chrome, and `TEST_BASE_URL` to test another server |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` / `npm run db:migrate:deploy` | Create a migration (dev) / apply migrations |
| `npm run db:seed` | Create the admin account + employee fund if missing (non-destructive) |

Before shipping a change, run: `npm run lint && npm run typecheck && npm test && npm run build`.

---

## 14. Project structure

```
prisma/
  schema.prisma            Database schema
  migrations/              SQL migrations
  seed.ts                  Demo data (destructive)
public/
  sw.js                    Service worker for push notifications
  icon.svg                 App icon
src/
  proxy.ts                 Route protection, hidden-module 404s/redirects
  app/
    page.tsx               "/" → login page
    (auth)/                login, change-password, accept-invite
    (dashboard)/           dashboard, expenses, budget, users, profile, audit-logs (+ hidden leave, trips)
    api/                   REST route handlers (auth, expenses, budget, users, push, cron, health, keep-warm, …)
    globals.css            Design tokens, light/dark theme, animations
  components/
    layout/                App shell, sidebar, top bar, user menu, page header, auth shell
    theme/                 Theme store, toggle, no-flash script
    motion/                Animation tokens, stagger, animated numbers
    celebration/           Birthday confetti, balloons, overlay, banner
    notifications/         Push hook, bell, settings card
    dashboard/ expenses/ budget/ users/ audit/ …   Page components
    ui/                    Buttons, inputs, cards, tables, dialogs, …
  lib/
    auth/                  Tokens, cookies, session, rate limit
    db/prisma.ts           Prisma client (Neon adapter + ws)
    services/              Business logic (expenses, budget, users, birthdays, office hours, …)
    push/                  Web push sender
    validators/            Zod schemas
    features.ts            Feature flags (Leave, Trips)
    env.ts                 Environment validation
tests/
  run-tests.mjs            Unit tests
  ui.spec.ts               Browser tests
```

---

## 15. Troubleshooting

| Problem | Fix |
|---|---|
| App won't start: *Invalid environment configuration* | A required variable in `.env` is missing or invalid; the error names it (section 4). |
| *replace the placeholder connection string* | Put your real Neon URLs in `DATABASE_URL` / `DIRECT_URL`. |
| `prisma migrate` fails | `DIRECT_URL` must be the **non-pooled** URL (no `-pooler`). |
| First request after a while is slow | The database was asleep; see section 10 (pre-warm + keep-warm pinger). |
| Login shows "database temporarily unavailable" | Neon was unreachable for a moment; just retry. If it persists, check the Neon console and your network. |
| Invites / temporary password emails fail | Check the `MAIL_*` settings; for Gmail use an app password with port 465 and `MAIL_SECURE=true`. |
| Notification bell missing | VAPID keys not set, or the browser doesn't support push (iPhone needs *Add to Home Screen*). |
| Notifications "blocked" | Allow notifications for the site in the browser's site settings, then reload. |
| Changed a `NEXT_PUBLIC_*` flag but nothing changed | Restart `npm run dev` or redeploy. |
| Port 3001 already in use | Stop the other `next dev` process, or run `npx next dev --port 3002`. |
| Budget on the dashboard looks wrong | The current budget is the latest one whose effective date has already started; check the Budget history. |
