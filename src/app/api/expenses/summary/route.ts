import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { expenseSummary } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const data = await expenseSummary({ userId: session.user.id, role: session.user.role }, new URL(request.url).searchParams);
    return ok("Expense summary fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
