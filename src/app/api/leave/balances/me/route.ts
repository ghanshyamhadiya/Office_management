import { requireSession } from "@/lib/auth/session";
import { getLeaveBalanceForUser } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await getLeaveBalanceForUser({ userId: session.user.id, role: session.user.role }, session.user.id);
    return ok("Leave balance fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
