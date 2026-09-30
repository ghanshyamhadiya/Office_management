import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { features } from "@/lib/features";
import { getCurrentBudget, getFundOverview } from "@/lib/services/budget-service";
import { expenseSummary } from "@/lib/services/expense-service";
import { deriveLeaveBalance } from "@/lib/services/leave-rules";

export type DashboardScope = "all" | "me";

function resolveVisibleUserIds(session: { userId: string; role: Role }, scope: DashboardScope) {
  return session.role !== "SUPER_ADMIN" || scope === "me" ? [session.userId] : null;
}

export async function getDashboardStats(
  session: { userId: string; role: Role },
  scope: DashboardScope = "all",
) {
  const visibleUserIds = resolveVisibleUserIds(session, scope);
  const now = new Date();
  const currentYear = now.getFullYear();
  const expenseParams = new URLSearchParams();

  if (visibleUserIds) {
    expenseParams.set("employee_ids", visibleUserIds.join(","));
  }

  const [currentBudget, expense, pendingLeave, pendingTrips, fund, balances, quarterlyFood, monthlySpend] = await Promise.all([
    getCurrentBudget(),
    expenseSummary(session, expenseParams),
    features.leave
      ? prisma.leaveRequest.count({
          where: {
            status: "PENDING",
            ...(visibleUserIds ? { userId: { in: visibleUserIds } } : {}),
          },
        })
      : 0,
    features.trips
      ? prisma.trip.count({
          where: {
            status: "PENDING",
            ...(visibleUserIds ? { userId: { in: visibleUserIds } } : {}),
          },
        })
      : 0,
    getFundOverview(session, visibleUserIds),
    features.leave
      ? prisma.leaveBalance.findMany({
          where: {
            year: currentYear,
            ...(visibleUserIds ? { userId: { in: visibleUserIds } } : {}),
          },
          include: { user: true, leaveType: true },
          orderBy: [{ user: { name: "asc" } }],
        })
      : [],
    prisma.expense.groupBy({
      by: ["month"],
      where: {
        archivedAt: null,
        expenseType: "FOOD",
        year: currentYear,
        ...(visibleUserIds ? { userId: { in: visibleUserIds } } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        archivedAt: null,
        expenseType: { in: ["FOOD", "OTHER"] },
        expenseDate: {
          gte: new Date(currentYear, now.getMonth(), 1),
          lt: new Date(currentYear, now.getMonth() + 1, 1),
        },
        ...(visibleUserIds ? { userId: { in: visibleUserIds } } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const quarterlyFoodSeries = [
    { label: "Jan-Mar", months: [1, 2, 3] },
    { label: "Apr-Jun", months: [4, 5, 6] },
    { label: "Jul-Sep", months: [7, 8, 9] },
    { label: "Oct-Dec", months: [10, 11, 12] },
  ].map((bucket) => ({
    label: bucket.label,
    total: quarterlyFood
      .filter((item) => bucket.months.includes(item.month))
      .reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
  }));

  const leaveBalances = balances.map((balance) => ({
    id: balance.id,
    userId: balance.userId,
    userName: balance.user.name,
    userEmail: balance.user.email,
    leaveTypeName: balance.leaveType.name,
    extraDays: balance.extraDays,
    summary: deriveLeaveBalance(balance.baseDays, balance.extraDays, balance.usedDays),
  }));

  return {
    scope,
    budget: {
      monthly: Number(currentBudget?.amount ?? 0),
      quarterly: Number(currentBudget?.amount ?? 0) * 3,
      spent: Number(monthlySpend._sum.amount ?? 0),
    },
    expenses: expense,
    pendingLeave,
    pendingTrips,
    fund,
    leaveBalances,
    quarterlyFood: quarterlyFoodSeries,
  };
}
