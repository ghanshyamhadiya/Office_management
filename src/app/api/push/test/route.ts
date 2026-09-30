import { requireSession } from "@/lib/auth/session";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";
import { fail, ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST() {
  try {
    const session = await requireSession();
    if (!isPushConfigured()) return fail("Push notifications are not configured on the server.", 503);
    const result = await sendPushToUsers([session.user.id], {
      title: "OfficeFlow notifications are on",
      body: "You'll get birthday wishes and team celebrations here.",
      url: "/dashboard",
      tag: "officeflow-test",
    });
    if (result.sent === 0) return fail("No active subscription found for this device. Enable notifications first.", 400);
    return ok("Test notification sent.", result);
  } catch (error) {
    return routeError(error);
  }
}
