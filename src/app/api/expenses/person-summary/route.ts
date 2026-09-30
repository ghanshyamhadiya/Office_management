import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET() {
  try {
    const session = await requireSession();
    const items = await prisma.expense.groupBy({
      by: ["userId"],
      where: session.user.role === "EMPLOYEE" ? { userId: session.user.id, archivedAt: null } : { archivedAt: null },
      _sum: { amount: true },
      _count: { _all: true }
    });
    return ok("Person summary fetched.", items);
  } catch (error) {
    return routeError(error);
  }
}
