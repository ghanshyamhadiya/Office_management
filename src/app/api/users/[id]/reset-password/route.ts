import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { resetUserPassword } from "@/lib/services/user-service";
import { ok } from "@/lib/utils/api";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = resetPasswordSchema.parse(await request.json());
    await resetUserPassword(session.user.id, id, body.newPassword);
    return ok("Password reset.");
  } catch (error) {
    return routeError(error);
  }
}
