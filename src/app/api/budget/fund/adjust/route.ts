import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { fundAdjustmentSchema } from "@/lib/validators/budget";
import { adjustFund } from "@/lib/services/budget-service";
import { ok } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = fundAdjustmentSchema.parse(await request.json());
    const adjustment = await adjustFund(session.user.id, body.employeeId, body.amount, body.reason);
    return ok("Fund adjusted.", adjustment);
  } catch (error) {
    return routeError(error);
  }
}
