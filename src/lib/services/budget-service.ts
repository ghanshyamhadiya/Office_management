import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { toDecimal } from "@/lib/db/decimal";
import { canContributeForYear } from "@/lib/services/fund-rules";

export async function getCurrentBudget(at = new Date()) {
  return prisma.monthlyBudget.findFirst({
    where: { effectiveFrom: { lte: at } },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
  });
}

export async function setBudget(actorId: string, amount: number, effectiveFrom: string, note?: string | null) {
  return prisma.$transaction(async (tx) => {
    const budget = await tx.monthlyBudget.create({
      data: {
        amount: toDecimal(amount),
        effectiveFrom: new Date(effectiveFrom),
        note: note ?? null,
        createdById: actorId
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "budget_set",
        entityType: "MonthlyBudget",
        entityId: budget.id
      }
    });

    return budget;
  });
}

export async function getBudgetHistory() {
  return prisma.monthlyBudget.findMany({
    orderBy: { effectiveFrom: "desc" },
    include: { createdBy: true }
  });
}

export async function getFundOverview(
  viewer: { userId: string; role: Role },
  scopeUserIds?: string[] | null,
) {
  const fund = await prisma.employeeFund.findUnique({ where: { id: "main" } });
  const where = scopeUserIds?.length
    ? { id: { in: scopeUserIds } }
    : viewer.role === "SUPER_ADMIN"
      ? {}
      : { id: viewer.userId };

  const [users, contributions, adjustments] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" }
    }),
    prisma.employeeFundContribution.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.employeeFundAdjustment.groupBy({ by: ["employeeId"], _sum: { amount: true } })
  ]);

  const contributionByUser = new Map(contributions.map((row) => [row.userId, Number(row._sum.amount ?? 0)]));
  const adjustmentByUser = new Map(adjustments.map((row) => [row.employeeId, Number(row._sum.amount ?? 0)]));
  const balances = users.map((user) => ({
    ...user,
    role: user.role === "MANAGER" ? ("EMPLOYEE" as const) : user.role,
    balance: (contributionByUser.get(user.id) ?? 0) + (adjustmentByUser.get(user.id) ?? 0)
  }));

  return { fund, balances };
}

export async function adjustFund(actorId: string, employeeId: string, amount: number, reason: string) {
  const adjustment = await prisma.$transaction(async (tx) => {
    await tx.employeeFund.upsert({
      where: { id: "main" },
      update: {},
      create: {
        id: "main",
        contributionAmount: toDecimal(1200)
      }
    });

    return tx.employeeFundAdjustment.create({
      data: {
        fundId: "main",
        employeeId,
        amount: toDecimal(amount),
        reason,
        adjustedById: actorId
      }
    });
  });

  await createAuditLog({
    actorId,
    action: "fund_adjusted",
    entityType: "EmployeeFundAdjustment",
    entityId: adjustment.id,
    targetUserId: employeeId
  });

  return adjustment;
}

export async function processBirthdayFundContributions() {
  const fund = await prisma.employeeFund.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", contributionAmount: toDecimal(1200) }
  });

  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const employees = await prisma.user.findMany({
    where: {
      isActive: true,
      birthday: { not: null }
    }
  });

  const created: string[] = [];

  for (const employee of employees) {
    if (!employee.birthday) continue;
    if (employee.birthday.getMonth() !== todayMonth || employee.birthday.getDate() !== todayDate) continue;

    const existing = await prisma.employeeFundContribution.findMany({
      where: { userId: employee.id },
      select: { year: true }
    });

    const year = now.getFullYear();
    if (!canContributeForYear(existing.map((item) => item.year), year)) {
      continue;
    }

    const contribution = await prisma.employeeFundContribution.create({
      data: {
        fundId: fund.id,
        userId: employee.id,
        year,
        amount: fund.contributionAmount,
        contributionDate: now
      }
    });

    created.push(contribution.id);
    await createAuditLog({
      action: "fund_contribution_created",
      entityType: "EmployeeFundContribution",
      entityId: contribution.id,
      targetUserId: employee.id
    });
  }

  return created;
}
