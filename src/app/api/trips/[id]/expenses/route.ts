import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const items = await prisma.expense.findMany({
      where: { tripId: id },
      include: { user: true },
      orderBy: { expenseDate: "desc" }
    });
    return ok("Trip expenses fetched.", items);
  } catch (error) {
    return routeError(error);
  }
}
