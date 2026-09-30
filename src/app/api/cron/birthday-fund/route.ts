import { env } from "@/lib/env";
import { processBirthdayFundContributions } from "@/lib/services/budget-service";
import { sendBirthdayNotifications } from "@/lib/services/birthday-notifications";
import { ok, fail } from "@/lib/utils/api";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const bearer = authHeader?.replace("Bearer ", "");

  if (cronHeader !== env.CRON_SECRET && bearer !== env.CRON_SECRET) {
    return fail("Unauthorized", 401);
  }

  const created = await processBirthdayFundContributions();
  const notifications = await sendBirthdayNotifications().catch((error) => {
    console.error("Birthday notifications failed", error);
    return { birthdays: 0, sent: 0, error: error instanceof Error ? error.message : "unknown" };
  });
  return ok("Birthday fund job completed.", { contributionsCreated: created.length, ids: created, notifications });
}
