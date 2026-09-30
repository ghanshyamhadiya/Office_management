import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { listExpenses } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const params = new URL(request.url).searchParams;
    params.set("is_archived", "true");
    const result = await listExpenses({ userId: session.user.id, role: session.user.role }, params);
    return ok("Archived expenses fetched.", result.items, result.meta);
  } catch (error) {
    return routeError(error);
  }
}
