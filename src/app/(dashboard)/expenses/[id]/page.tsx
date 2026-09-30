import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/prisma";
import { features } from "@/lib/features";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { user: true, trip: true, settledBy: true, archivedBy: true }
  });
  if (!expense) notFound();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>{expense.title}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Employee</span><span>{expense.user.name}</span></div>
        <div className="flex justify-between"><span>Type</span><Badge>{expense.expenseType}</Badge></div>
        <div className="flex justify-between"><span>Amount</span><span>{Number(expense.amount).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Status</span><span>{expense.isSettled ? "Settled" : "Unsettled"}</span></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-slate-600">
        <p>{expense.description ?? "No description added."}</p>
        {features.trips ? <p>Trip: {expense.trip?.title ?? "Not linked"}</p> : null}
        <p>Archived reason: {expense.archivedReason ?? "Not archived"}</p>
      </CardContent></Card>
    </div>
  );
}
