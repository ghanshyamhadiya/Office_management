import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { extraLeaveSchema } from "@/lib/validators/leave";
import { addExtraLeaves } from "@/lib/services/leave-service";
import { ok } from "@/lib/utils/api";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = extraLeaveSchema.parse(await request.json());
    const balance = await addExtraLeaves(
      { userId: session.user.id, role: session.user.role },
      id,
      body.leaveTypeId,
      body.year,
      body.days,
      body.reason
    );
    return ok("Extra leaves added.", balance);
  } catch (error) {
    return routeError(error);
  }
}
