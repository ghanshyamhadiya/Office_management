import { requireRole, routeError } from "@/lib/utils/route";
import { restoreExpense } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const item = await restoreExpense(session.user.id, id);
    return ok("Expense restored.", item);
  } catch (error) {
    return routeError(error);
  }
}
