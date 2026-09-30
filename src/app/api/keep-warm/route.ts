import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { decideKeepWarm, parseOfficeSchedule } from "@/lib/services/office-hours";
import { fail, ok } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

const schedule = parseOfficeSchedule(env.OFFICE_HOURS, env.OFFICE_DAYS);

// Point an external pinger here every KEEP_WARM_PING_MINUTES (default 4), 24/7.
// Office hours: the database is kept awake continuously.
// Off hours: it is woken once every OFF_HOURS_WARM_INTERVAL_MINUTES (default 30)
// so it stays available at a fraction of the compute cost.
export async function GET() {
  const decision = decideKeepWarm(schedule, env.APP_TIMEZONE, {
    offHoursIntervalMinutes: env.OFF_HOURS_WARM_INTERVAL_MINUTES,
    pingEveryMinutes: env.KEEP_WARM_PING_MINUTES,
  });
  const info = {
    mode: decision.mode,
    timeZone: env.APP_TIMEZONE,
    officeHours: env.OFFICE_HOURS,
    officeDays: env.OFFICE_DAYS,
    offHoursIntervalMinutes: env.OFF_HOURS_WARM_INTERVAL_MINUTES,
  };

  if (!decision.warm) {
    return ok("Off hours; waiting for the next scheduled warm-up.", { warmed: false, ...info });
  }

  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok("Database kept warm.", { warmed: true, latencyMs: Date.now() - startedAt, ...info });
  } catch (error) {
    console.error("Keep-warm ping failed", error);
    return fail("Database unavailable.", 503, { warmed: false, latencyMs: Date.now() - startedAt, ...info });
  }
}
