import { requireSession } from "@/lib/auth/session";
import { getLeaveBalanceForUser } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireSession();
    const { userId } = await params;
    const data = await getLeaveBalanceForUser({ userId: session.user.id, role: session.user.role }, userId);
    return ok("Leave balance fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
