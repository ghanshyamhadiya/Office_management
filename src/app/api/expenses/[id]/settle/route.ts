import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { settleExpenseSchema } from "@/lib/validators/expenses";
import { toggleExpenseSettlement } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = settleExpenseSchema.parse(await request.json());
    const item = await toggleExpenseSettlement({ userId: session.user.id, role: session.user.role }, id, body.isSettled);
    return ok("Expense settlement updated.", item);
  } catch (error) {
    return routeError(error);
  }
}
