import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const invite = await prisma.userInvite.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
    return ok("Invite revoked.", invite);
  } catch (error) {
    return routeError(error);
  }
}
