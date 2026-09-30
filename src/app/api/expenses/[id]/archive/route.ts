import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { archiveExpenseSchema } from "@/lib/validators/expenses";
import { archiveExpense } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = archiveExpenseSchema.parse(await request.json());
    const item = await archiveExpense({ userId: session.user.id, role: session.user.role }, id, body.reason);
    return ok("Expense archived.", item);
  } catch (error) {
    return routeError(error);
  }
}
