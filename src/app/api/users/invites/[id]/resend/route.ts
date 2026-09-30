import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { inviteUser } from "@/lib/services/user-service";
import { ok } from "@/lib/utils/api";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const invite = await prisma.userInvite.findUniqueOrThrow({ where: { id } });
    const resent = await inviteUser(session.user.id, {
      email: invite.email,
      role: invite.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EMPLOYEE",
      name: invite.name
    });
    return ok("Invite resent.", resent.invite);
  } catch (error) {
    return routeError(error);
  }
}
