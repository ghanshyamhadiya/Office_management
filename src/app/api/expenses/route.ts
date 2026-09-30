import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { expenseSchema } from "@/lib/validators/expenses";
import { createExpense, listExpenses } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listExpenses({ userId: session.user.id, role: session.user.role }, new URL(request.url).searchParams);
    return ok("Expenses fetched.", result.items, result.meta);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = expenseSchema.parse(await request.json());
    const result = await createExpense({ userId: session.user.id, role: session.user.role }, body);
    return ok("Expense created.", result.expense, undefined, result.warning, 201);
  } catch (error) {
    return routeError(error);
  }
}
