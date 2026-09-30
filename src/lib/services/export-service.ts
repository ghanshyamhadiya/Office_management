import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createWorkbookSheet } from "@/lib/excel/workbook";

export async function exportExpenses(session: { userId: string; role: Role }) {
  const where =
    session.role === "SUPER_ADMIN"
      ? { archivedAt: null }
      : { archivedAt: null, userId: session.userId };

  const expenses = await prisma.expense.findMany({
    where,
    include: { user: true, trip: true },
    orderBy: { expenseDate: "desc" }
  });

  const rows = expenses.map((expense) => ({
    Date: expense.expenseDate.toISOString().slice(0, 10),
    Employee: expense.user.name,
    Type: expense.expenseType,
    Title: expense.title,
    Amount: Number(expense.amount),
    Settled: expense.isSettled ? "Yes" : "No",
    Trip: expense.trip?.title ?? "-"
  }));

  return createWorkbookSheet(
    "Expenses",
    rows,
    "Total",
    rows.reduce((sum, row) => sum + row.Amount, 0)
  );
}

export async function exportLeave(session: { userId: string; role: Role }) {
  const where =
    session.role === "SUPER_ADMIN"
      ? {}
      : { userId: session.userId };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { user: true, leaveType: true },
    orderBy: { startDate: "desc" }
  });

  const rows = requests.map((request) => ({
    Employee: request.user.name,
    Type: request.leaveType.name,
    Start: request.startDate.toISOString().slice(0, 10),
    End: request.endDate.toISOString().slice(0, 10),
    Days: request.totalDays,
    Status: request.status
  }));

  return createWorkbookSheet("Leave", rows, "Total days", rows.reduce((sum, row) => sum + row.Days, 0));
}

export async function exportTrips(session: { userId: string; role: Role }) {
  const where =
    session.role === "SUPER_ADMIN"
      ? {}
      : { userId: session.userId };

  const trips = await prisma.trip.findMany({
    where,
    include: { user: true },
    orderBy: { departureDate: "desc" }
  });

  const rows = trips.map((trip) => ({
    Employee: trip.user.name,
    Title: trip.title,
    Destination: trip.destination,
    Departure: trip.departureDate.toISOString().slice(0, 10),
    Return: trip.returnDate.toISOString().slice(0, 10),
    Days: trip.totalDays,
    EstimatedBudget: Number(trip.estimatedBudget),
    ActualTotal: Number(trip.actualTotal),
    Status: trip.status
  }));

  return createWorkbookSheet("Trips", rows, "Total actual", rows.reduce((sum, row) => sum + row.ActualTotal, 0));
}
