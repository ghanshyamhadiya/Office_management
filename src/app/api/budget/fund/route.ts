import { requireRole, routeError } from "@/lib/utils/route";
import { getFundOverview } from "@/lib/services/budget-service";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EMPLOYEE"]);
    const data = await getFundOverview({ userId: session.user.id, role: session.user.role });
    return ok("Fund overview fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
