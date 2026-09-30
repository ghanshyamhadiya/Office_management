# OfficeFlow

> 📘 **Full setup & how-it-works guide: [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

OfficeFlow is a production-oriented internal office management application built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui-style components, Prisma, Neon Postgres, TanStack Query, React Hook Form, Zod, cookie-based auth, Nodemailer SMTP, real XLSX exports, and a protected Vercel Cron endpoint.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM + Neon Postgres
- TanStack Query
- React Hook Form + Zod
- Framer Motion
- Cookie auth with httpOnly cookies
- XLSX exports on the server
- Vercel + Neon ready configuration

## Features

- Two roles: Admin (`SUPER_ADMIN`) manages everything; Employees work with their own expenses
- Custom login, refresh, logout, change-password, and invite acceptance flows
- Leave and other leave workflows with working-day calculation (hidden behind `NEXT_PUBLIC_FEATURE_LEAVE`)
- Expense creation, settlement, archiving, summaries, and Excel export
- Trip lifecycle with itinerary rows and linked trip-expense handling
- Monthly budget tracking and employee fund adjustments
- Audit logs for sensitive actions
- Protected birthday fund cron endpoint

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a Neon project and database.
3. In Neon, copy:

- pooled connection string into `DATABASE_URL`
- direct connection string into `DIRECT_URL`

4. The repo now includes real local env files:

- `.env`
- `.env.local`
- `.env.example`

Update `.env` and `.env.local` with your real Neon and SMTP values. Keep both files aligned locally to avoid confusion from overrides.

5. Required env keys:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `APP_URL`
- `CRON_SECRET`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_FEATURE_TRIPS` (optional, default `false`) — hides the Trips module (nav, `/trips`, trip APIs and exports, trip fields in Expenses) the same way as Leave, without deleting code or data.
- `NEXT_PUBLIC_FEATURE_LEAVE` (optional, default `false`) — the Leave module is hidden for every role unless this is `"true"`. The code, schema, and data stay intact; when disabled, `/leave` redirects to `/dashboard`, leave APIs return 404, and leave widgets are hidden. Restart/rebuild after changing it because `NEXT_PUBLIC_*` values are inlined at build time.

6. Generate the Prisma client:

```bash
npx prisma generate
```

7. Create and apply your local migration:

```bash
npx prisma migrate dev
```

8. Seed development data:

```bash
npm run db:seed
```

9. Start the app:

```bash
npm run dev
```

10. Open:

- `http://localhost:3001/`
- `http://localhost:3001/login`

## Seed credentials

`npm run db:seed` creates only the admin account (non-destructive, safe to re-run):

- `admin@officeflow.local / Password123!` (change it after first login)

Roles are **Admin** and **Employee** only; there is no manager hierarchy. See [SETUP_GUIDE.md](./SETUP_GUIDE.md#6-roles--permissions).

## Database notes

- Money fields use Prisma `Decimal`.
- Refresh tokens and invite tokens are stored hashed.
- `LeaveBalance` is unique per `userId + leaveTypeId + year`.
- `ExpenseSettlement` is unique per `employeeId + month + year`.
- Birthday fund contributions are unique per `userId + year`.

## Neon connection details

- `DATABASE_URL` must be the pooled Neon URL. This is the runtime connection used by the app through the Neon Prisma adapter.
- `DIRECT_URL` must be the direct Neon URL. This is used by Prisma CLI commands such as `prisma migrate dev`.
- The template env files use the Neon-style query params `sslmode=require`, `channel_binding=require`, and `pgbouncer=true` on the pooled URL.

## SMTP details

OfficeFlow now uses Nodemailer over SMTP only.

- `MAIL_HOST`: SMTP host
- `MAIL_PORT`: SMTP port such as `465` or `587`
- `MAIL_SECURE`: `true` for implicit TLS, `false` otherwise
- `MAIL_USER`: SMTP username
- `MAIL_PASS`: SMTP password
- `MAIL_FROM`: sender address used for invite and temporary-password emails

If these values are missing, mail sending fails clearly at send time.

## Vercel and production deployment

- Use Neon pooled connection for `DATABASE_URL`.
- Use Neon direct connection for `DIRECT_URL`.
- Configure `APP_URL` with the deployed URL in production and `http://localhost:3001` locally.
- Set strong values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CRON_SECRET`.
- Add the same `CRON_SECRET` to the Vercel Cron request as either `Authorization: Bearer ...` or `x-cron-secret`.
- `vercel.json` already schedules the birthday fund job.

## Birthday celebrations and push notifications

- On an employee's birthday (in `APP_TIMEZONE`, default `Asia/Kolkata`), the birthday person sees a full-screen celebration (confetti, balloons, animated greeting) once per day. Everyone else sees a dismissible "Today is X's birthday" banner.
- Web push uses VAPID keys: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Generate them with `npx web-push generate-vapid-keys`. If they are missing, push is disabled and the bell is hidden.
- Users turn notifications on with the bell in the top bar or on the Profile page, which also has a "Send test" button.
- The daily `/api/cron/birthday-fund` job also sends a birthday push to the birthday person and a team push to everyone else who has notifications turned on.
- Push needs HTTPS (or `localhost`). On iPhone/iPad, the site must first be added to the Home Screen.
- Apply the new `PushSubscription` table with `npx prisma migrate deploy` (or `migrate dev`).

## Keeping the database warm

- `GET /api/health` runs `SELECT 1` and returns the latency. The login page calls it on load so a sleeping Neon compute wakes while the user is typing.
- The login page also re-warms when the tab becomes visible again after 4+ minutes.
- `GET /api/keep-warm` is meant for an external pinger. It has two modes:
  - **Office hours** (`OFFICE_HOURS` on `OFFICE_DAYS` in `APP_TIMEZONE`, default `10:00-20:00`, Mon-Fri, `Asia/Kolkata`): every ping queries the database, so it never scales to zero.
  - **Off hours** (nights and weekends): the database is woken once every `OFF_HOURS_WARM_INTERVAL_MINUTES` (default `30`). It stays reachable, and any real request still wakes it in a few hundred milliseconds. Set it to `0` to let it sleep fully off-hours.
- Point your pinger (your own site, cron-job.org, UptimeRobot, etc.) at `https://<your-app>/api/keep-warm` **every 4 minutes, 24/7**, and keep `KEEP_WARM_PING_MINUTES` equal to that interval. Use 4 minutes, not 5: Neon suspends after exactly 5 idle minutes, so a 5-minute ping can miss.
- Monthly budget at 0.25 CU on Neon Free (100 CU-hours):
  - Office hours: 10 h × ~22 days ≈ 220 h → ~55 CU-h
  - Off hours at 30 min: ~1,020 wake-ups × ~5 min awake ≈ 85 h → ~21 CU-h
  - Total ≈ **76 CU-h**, leaving about 24 CU-h for real traffic and autoscaling. Going below a 30-minute off-hours interval (for example 15 min ≈ 97 CU-h) risks hitting the quota. Neon then suspends the database until the next billing cycle.
- True 24/7 always-on (~182 CU-h) is not possible on the Free plan. It needs a paid Neon plan with scale-to-zero disabled.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:ui` — browser checks for root login, post-login navigation, error handling, and mobile layout. Start `npm run dev` first. Uses installed Microsoft Edge by default; set `PLAYWRIGHT_CHANNEL=chrome` for Chrome, and `TEST_BASE_URL` to test another running server. These tests mock login responses and do not change database records.
- `npx prisma generate`
- `npx prisma migrate dev`
- `npm run db:seed`
- `npm run dev`

## Troubleshooting

### Prisma client constructor error about adapter or accelerateUrl

This project uses Prisma 7 with the Neon adapter. The runtime client is created in `src/lib/db/prisma.ts` with `@prisma/adapter-neon` and the `ws` WebSocket implementation. Local Node 24 testing reproduced intermittent native WebSocket `ErrorEvent` failures; `ws` passed repeated new-connection checks. Connection establishment has a 30-second timeout. Database errors are not treated as an invalid session. If you see the constructor error:

1. run `npm install`
2. run `npx prisma generate`
3. confirm `DATABASE_URL` and `DIRECT_URL` are set in `.env` or `.env.local`
4. confirm `src/lib/db/prisma.ts` is using `@prisma/adapter-neon`

### Prisma migrate commands fail

`prisma.config.ts` loads `.env` and `.env.local` and uses `DIRECT_URL`. Make sure `DIRECT_URL` is the non-pooled Neon connection string.

### Seed fails

Run:

```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
```

The seed script is standalone and no longer depends on app-only path aliases. It prints the dev credentials when it succeeds.

### Login returns 400

- Make sure `npm run db:seed` completed successfully.
- Use one of the seeded credentials listed above.
- Validation and auth failures now return readable JSON messages from `/api/auth/login`.

### SMTP mail fails

Check `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, and `MAIL_FROM`. OfficeFlow now uses Nodemailer only; no Resend configuration is used.

## Project layout

- `src/app`: pages and route handlers
- `src/components`: layout, UI, forms, tables
- `src/lib`: auth, services, validators, utilities, mail, audit, Excel helpers
- `prisma`: schema, migration placeholder, seed script
- `tests`: targeted core business-rule tests
