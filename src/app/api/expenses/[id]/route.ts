import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { expenseSchema } from "@/lib/validators/expenses";
import { updateExpense } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const item = await prisma.expense.findUnique({
      where: { id },
      include: { user: true, trip: true, settledBy: true, archivedBy: true }
    });
    return ok("Expense fetched.", item);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = expenseSchema.parse(await request.json());
    const item = await updateExpense({ userId: session.user.id, role: session.user.role }, id, body);
    return ok("Expense updated.", item);
  } catch (error) {
    return routeError(error);
  }
}
