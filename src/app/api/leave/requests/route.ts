import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { leaveRequestSchema } from "@/lib/validators/leave";
import { createLeaveRequest } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET() {
  try {
    const session = await requireSession();
    const where =
      session.user.role === "SUPER_ADMIN"
        ? {}
        : session.user.role === "MANAGER"
          ? { OR: [{ userId: session.user.id }, { user: { managerId: session.user.id } }] }
          : { userId: session.user.id };
    const items = await prisma.leaveRequest.findMany({
      where,
      include: { user: true, leaveType: true, reviewedBy: true },
      orderBy: { createdAt: "desc" }
    });
    return ok("Leave requests fetched.", items);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = leaveRequestSchema.parse(await request.json());
    const data = await createLeaveRequest(session.user.id, body);
    return ok("Leave request created.", data);
  } catch (error) {
    return routeError(error);
  }
}
