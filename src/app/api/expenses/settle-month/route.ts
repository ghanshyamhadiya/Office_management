import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { settleMonthSchema } from "@/lib/validators/expenses";
import { bulkSettleMonth } from "@/lib/services/expense-service";
import { ok } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = settleMonthSchema.parse(await request.json());
    const data = await bulkSettleMonth({ userId: session.user.id, role: session.user.role }, body.employeeIds, body.month, body.year);
    return ok("Monthly settlement completed.", data);
  } catch (error) {
    return routeError(error);
  }
}
