import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const items = await prisma.expenseSettlement.findMany({
      include: { employee: true, settledBy: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
    return ok("Settlements fetched.", items);
  } catch (error) {
    return routeError(error);
  }
}
