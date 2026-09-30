import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { budgetSchema } from "@/lib/validators/budget";
import { setBudget } from "@/lib/services/budget-service";
import { ok } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = budgetSchema.parse(await request.json());
    const budget = await setBudget(session.user.id, body.amount, body.effectiveFrom, body.note);
    return ok("Budget set.", budget);
  } catch (error) {
    return routeError(error);
  }
}
