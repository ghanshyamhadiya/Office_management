import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { inviteUserSchema } from "@/lib/validators/auth";
import { inviteUser } from "@/lib/services/user-service";
import { ok } from "@/lib/utils/api";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = inviteUserSchema.parse(await request.json());
    const result = await inviteUser(session.user.id, body);
    return ok("Invite sent.", result.invite);
  } catch (error) {
    return routeError(error);
  }
}
