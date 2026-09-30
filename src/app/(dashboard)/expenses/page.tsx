import { requireSession } from "@/lib/auth/session";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export default async function ExpensesPage() {
  const session = await requireSession();

  return <ExpensesClient role={session.user.role} />;
}
