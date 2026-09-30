import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const data = await prisma.employeeFundAdjustment.findMany({
      include: { employee: true, adjustedBy: true },
      orderBy: { createdAt: "desc" }
    });
    return ok("Fund adjustments fetched.", data);
  } catch (error) {
    return routeError(error);
  }
}
