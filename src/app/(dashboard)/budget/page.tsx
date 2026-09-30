import { requireSession } from "@/lib/auth/session";
import { BudgetClient } from "@/components/budget/budget-client";

export default async function BudgetPage() {
  const session = await requireSession();

  return <BudgetClient role={session.user.role} userId={session.user.id} />;
}
