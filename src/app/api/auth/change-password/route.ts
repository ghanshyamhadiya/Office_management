import { NextRequest } from "next/server";
import { changePasswordSchema } from "@/lib/validators/auth";
import { requireSession } from "@/lib/auth/session";
import { changePassword } from "@/lib/services/auth-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = changePasswordSchema.parse(await request.json());
    await changePassword(session.user.id, body.currentPassword, body.newPassword);
    return ok("Password changed.");
  } catch (error) {
    return routeError(error);
  }
}
