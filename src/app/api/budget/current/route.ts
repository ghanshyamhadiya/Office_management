import { getCurrentBudget } from "@/lib/services/budget-service";
import { ok } from "@/lib/utils/api";

export async function GET() {
  const budget = await getCurrentBudget();
  return ok("Current budget fetched.", budget ? { ...budget, quarterly: Number(budget.amount) * 3 } : null);
}
