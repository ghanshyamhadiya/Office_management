import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { normalizeSettlementMonth } from "@/lib/services/settlement-rules";
import { ok } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const searchParams = new URL(request.url).searchParams;
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const employeeIds = searchParams
      .get("employee_ids")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const { start, end } = normalizeSettlementMonth(month, year);

    const allowedEmployeeIds = employeeIds;

    const data = await prisma.expense.groupBy({
      by: ["userId"],
      where: {
        archivedAt: null,
        isSettled: false,
        expenseDate: { gte: start, lte: end }
        ,
        ...(allowedEmployeeIds?.length ? { userId: { in: allowedEmployeeIds } } : {})
      },
      _sum: { amount: true }
    });
    return ok("Settle preview fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
