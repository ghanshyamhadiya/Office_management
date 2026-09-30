import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const item = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true, leaveType: true, reviewedBy: true }
    });
    return ok("Leave request fetched.", item);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const item = await prisma.leaveRequest.findUniqueOrThrow({ where: { id } });
    if (item.userId !== session.user.id || item.status !== "PENDING") {
      throw new Error("FORBIDDEN");
    }
    const deleted = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
    return ok("Leave request cancelled.", deleted);
  } catch (error) {
    return routeError(error);
  }
}
