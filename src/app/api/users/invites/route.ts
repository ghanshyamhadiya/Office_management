import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const invites = await prisma.userInvite.findMany({
      orderBy: { createdAt: "desc" },
      include: { invitedBy: true }
    });
    return ok("Invites fetched.", invites);
  } catch (error) {
    return routeError(error);
  }
}
