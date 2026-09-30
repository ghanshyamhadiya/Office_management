import { requireRole, routeError } from "@/lib/utils/route";
import { getBudgetHistory } from "@/lib/services/budget-service";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const history = await getBudgetHistory();
    return ok("Budget history fetched.", history);
  } catch (error) {
    return routeError(error);
  }
}
