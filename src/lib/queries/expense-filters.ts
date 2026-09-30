import { ExpenseType, Prisma, Role } from "@prisma/client";

export function buildExpenseWhere(
  searchParams: URLSearchParams,
  session: { role: Role; userId: string }
): Prisma.ExpenseWhereInput {
  const expenseType = searchParams.get("expense_type") as ExpenseType | null;
  const isSettled = searchParams.get("is_settled");
  const employeeIds = searchParams.getAll("employee_ids");
  const search = searchParams.get("search");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const minAmount = searchParams.get("min_amount");
  const maxAmount = searchParams.get("max_amount");
  const archivedFlag = searchParams.get("is_archived");

  const where: Prisma.ExpenseWhereInput = {};


  if (expenseType) where.expenseType = expenseType;
  if (isSettled !== null) where.isSettled = isSettled === "true";
  // Only admins see other people; everyone else is always limited to their own expenses.
  if (session.role !== "SUPER_ADMIN") where.userId = session.userId;
  else if (employeeIds.length) where.userId = { in: employeeIds.flatMap((value) => value.split(",")).filter(Boolean) };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }
  if (month) where.month = Number(month);
  if (year) where.year = Number(year);
  if (from || to) {
    where.expenseDate = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(to) : undefined
    };
  }
  if (minAmount || maxAmount) {
    where.amount = {
      gte: minAmount ?? undefined,
      lte: maxAmount ?? undefined
    };
  }
  if (archivedFlag === null) {
    where.archivedAt = null;
  } else if (archivedFlag === "true") {
    where.archivedAt = { not: null };
  } else {
    where.archivedAt = null;
  }

  return where;
}
