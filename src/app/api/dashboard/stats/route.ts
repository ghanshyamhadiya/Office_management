import { requireSession } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/services/dashboard-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const searchParams = new URL(request.url).searchParams;
    const scope = searchParams.get("scope") === "me" ? "me" : "all";
    const stats = await getDashboardStats({ userId: session.user.id, role: session.user.role }, scope);
    return ok("Dashboard stats fetched.", stats);
  } catch (error) {
    return routeError(error);
  }
}
