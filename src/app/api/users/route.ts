import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { createUserSchema } from "@/lib/validators/auth";
import { createUser, listUsers } from "@/lib/services/user-service";
import { ok } from "@/lib/utils/api";

export async function GET() {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EMPLOYEE"]);
    const users = await listUsers({ userId: session.user.id, role: session.user.role });
    return ok("Users fetched.", users);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = createUserSchema.parse(await request.json());
    const user = await createUser(session.user.id, body);
    return ok("User created.", user);
  } catch (error) {
    return routeError(error);
  }
}
