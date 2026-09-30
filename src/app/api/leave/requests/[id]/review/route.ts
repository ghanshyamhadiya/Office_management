import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { leaveReviewSchema } from "@/lib/validators/leave";
import { reviewLeaveRequest } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = leaveReviewSchema.parse(await request.json());
    await reviewLeaveRequest({ userId: session.user.id, role: session.user.role }, id, body.status, body.note);
    return ok("Leave request reviewed.");
  } catch (error) {
    return routeError(error);
  }
}
