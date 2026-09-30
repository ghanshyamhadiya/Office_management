import { ExpenseType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { toDecimal } from "@/lib/db/decimal";
import { buildExpenseWhere } from "@/lib/queries/expense-filters";
import { parsePagination } from "@/lib/utils/pagination";
import { affectsBudget, summarizeExpenses, deriveBudgetWarning } from "@/lib/services/expense-rules";
import { createAuditLog } from "@/lib/audit";
import { normalizeSettlementMonth } from "@/lib/services/settlement-rules";
import { getCurrentBudget } from "@/lib/services/budget-service";

async function sessionScope(session: { userId: string; role: Role }) {
  return {
    role: session.role,
    userId: session.userId,
  };
}

function settlementEvent(action: "settled" | "unsettled", actorId: string, totalAmount: number) {
  return {
    action,
    actorId,
    totalAmount,
    at: new Date().toISOString()
  };
}

export async function listExpenses(session: { userId: string; role: Role }, searchParams: URLSearchParams) {
  const scope = await sessionScope(session);
  const where = buildExpenseWhere(searchParams, scope);
  const { page, limit, skip } = parsePagination(searchParams);

  const [items, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      include: { user: true, trip: true, settledBy: true },
      orderBy: { expenseDate: "desc" },
      skip,
      take: limit
    }),
    prisma.expense.count({ where })
  ]);

  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function expenseSummary(session: { userId: string; role: Role }, searchParams: URLSearchParams) {
  const scope = await sessionScope(session);
  const where = buildExpenseWhere(searchParams, scope);
  const includeArchived = searchParams.get("include_archived") === "true";

  if (includeArchived) {
    const expenses = await prisma.expense.findMany({
      where,
      select: { amount: true, expenseType: true, isSettled: true, archivedAt: true }
    });
    return summarizeExpenses(
      expenses.map((expense) => ({ ...expense, amount: Number(expense.amount) })),
      true
    );
  }

  // Aggregate in the database instead of loading every expense row.
  const [groups, archivedCount] = await Promise.all([
    prisma.expense.groupBy({
      by: ["expenseType", "isSettled"],
      where: { AND: [where, { archivedAt: null }] },
      _sum: { amount: true },
      _count: { _all: true }
    }),
    prisma.expense.count({ where: { AND: [where, { archivedAt: { not: null } }] } })
  ]);

  return groups.reduce(
    (acc, group) => {
      const amount = Number(group._sum.amount ?? 0);
      acc.count += group._count._all;
      acc.total += amount;
      if (group.isSettled) acc.settled += amount;
      else acc.unsettled += amount;
      if (affectsBudget(group.expenseType)) acc.budgetTotal += amount;
      if (group.expenseType === "TRIP") acc.tripTotal += amount;
      return acc;
    },
    { count: 0, total: 0, settled: 0, unsettled: 0, budgetTotal: 0, tripTotal: 0, archivedCount }
  );
}

export async function createExpense(session: { userId: string; role: Role }, data: {
  title: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  expenseType: ExpenseType;
  tripId?: string | null;
}) {
  const expenseDate = new Date(data.expenseDate);
  const budget = await getCurrentBudget();

  const expense = await prisma.expense.create({
    data: {
      userId: session.userId,
      title: data.title,
      description: data.description ?? null,
      amount: toDecimal(data.amount),
      expenseDate,
      expenseType: data.expenseType,
      tripId: data.tripId ?? null,
      month: expenseDate.getMonth() + 1,
      year: expenseDate.getFullYear()
    }
  });

  if (data.tripId && data.expenseType === "TRIP") {
    const total = await prisma.expense.aggregate({
      where: { tripId: data.tripId, expenseType: "TRIP", archivedAt: null },
      _sum: { amount: true }
    });
    await prisma.trip.update({
      where: { id: data.tripId },
      data: { actualTotal: total._sum.amount ?? new Prisma.Decimal(0) }
    });
  }

  const summary = await prisma.expense.aggregate({
    where: {
      archivedAt: null,
      month: expense.month,
      year: expense.year,
      expenseType: { in: ["FOOD", "OTHER"] }
    },
    _sum: { amount: true }
  });

  const warning = budget
    ? deriveBudgetWarning(Number(budget.amount), Number(summary._sum.amount ?? 0))
    : undefined;

  return { expense, warning };
}

export async function updateExpense(session: { userId: string; role: Role }, expenseId: string, data: {
  title: string;
  description?: string | null;
  amount: number;
  expenseDate: string;
  expenseType: ExpenseType;
  tripId?: string | null;
}) {
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  if (session.role === "EMPLOYEE" && expense.userId !== session.userId) {
    throw new Error("FORBIDDEN");
  }
  if (expense.isSettled || expense.archivedAt) {
    throw new Error("Only unsettled non-archived expenses can be edited.");
  }

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      title: data.title,
      description: data.description ?? null,
      amount: toDecimal(data.amount),
      expenseDate: new Date(data.expenseDate),
      expenseType: data.expenseType,
      tripId: data.tripId ?? null
    }
  });
}

export async function toggleExpenseSettlement(actor: { userId: string; role: Role }, expenseId: string, isSettled: boolean) {
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  if (expense.archivedAt) {
    throw new Error("Archived expense cannot be settled.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        isSettled,
        settledAt: isSettled ? new Date() : null,
        settledById: isSettled ? actor.userId : null
      }
    });

    const existing = await tx.expenseSettlement.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: expense.userId,
          month: expense.month,
          year: expense.year
        }
      }
    });

    const history = Array.isArray(existing?.history) ? existing?.history : [];
    const event = settlementEvent(isSettled ? "settled" : "unsettled", actor.userId, Number(expense.amount));

    await tx.expenseSettlement.upsert({
      where: {
        employeeId_month_year: {
          employeeId: expense.userId,
          month: expense.month,
          year: expense.year
        }
      },
      update: {
        isSettled,
        totalAmount: toDecimal(Number(expense.amount)),
        history: [...history, event],
        settledById: actor.userId,
        settledAt: new Date()
      },
      create: {
        employeeId: expense.userId,
        month: expense.month,
        year: expense.year,
        totalAmount: toDecimal(Number(expense.amount)),
        isSettled,
        history: [event],
        settledById: actor.userId
      }
    });

    return updated;
  });
}

export async function archiveExpense(actor: { userId: string; role: Role }, expenseId: string, reason: string) {
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  const isOwnArchivable = actor.role === "EMPLOYEE" && expense.userId === actor.userId && !expense.isSettled && !expense.archivedAt;
  const isAdminArchivable = actor.role === "SUPER_ADMIN";
  if (!isOwnArchivable && !isAdminArchivable) {
    throw new Error("FORBIDDEN");
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      archivedAt: new Date(),
      archivedById: actor.userId,
      archivedReason: reason
    }
  });

  await createAuditLog({
    actorId: actor.userId,
    action: "expense_archived",
    entityType: "Expense",
    entityId: expenseId,
    targetUserId: expense.userId
  });

  return updated;
}

export async function restoreExpense(actorId: string, expenseId: string) {
  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      archivedAt: null,
      archivedById: null,
      archivedReason: null
    }
  });

  await createAuditLog({
    actorId,
    action: "expense_restored",
    entityType: "Expense",
    entityId: expenseId,
    targetUserId: updated.userId
  });

  return updated;
}

export async function bulkSettleMonth(actor: { userId: string; role: Role }, employeeIds: string[], month: number, year: number) {
  const range = normalizeSettlementMonth(month, year);

  return prisma.$transaction(async (tx) => {
    const expenses = await tx.expense.findMany({
      where: {
        userId: { in: employeeIds },
        archivedAt: null,
        expenseDate: { gte: range.start, lte: range.end }
      }
    });

    const updates = await Promise.all(
      employeeIds.map(async (employeeId) => {
        const employeeExpenses = expenses.filter((expense) => expense.userId === employeeId);
        const totalAmount = employeeExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

        await tx.expense.updateMany({
          where: {
            userId: employeeId,
            archivedAt: null,
            expenseDate: { gte: range.start, lte: range.end }
          },
          data: {
            isSettled: true,
            settledAt: new Date(),
            settledById: actor.userId
          }
        });

        return tx.expenseSettlement.upsert({
          where: { employeeId_month_year: { employeeId, month, year } },
          update: {
            totalAmount: toDecimal(totalAmount),
            isSettled: true,
            history: [settlementEvent("settled", actor.userId, totalAmount)],
            settledById: actor.userId,
            settledAt: new Date()
          },
          create: {
            employeeId,
            month,
            year,
            totalAmount: toDecimal(totalAmount),
            isSettled: true,
            history: [settlementEvent("settled", actor.userId, totalAmount)],
            settledById: actor.userId
          }
        });
      })
    );

    await createAuditLog({
      actorId: actor.userId,
      action: "expenses_bulk_settled",
      entityType: "ExpenseSettlement",
      metadata: { employeeIds, month, year }
    });

    return updates;
  });
}
