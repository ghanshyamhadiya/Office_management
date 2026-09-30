import { NextRequest } from "next/server";
import { acceptInviteSchema } from "@/lib/validators/auth";
import { acceptInvite } from "@/lib/services/user-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const body = acceptInviteSchema.parse(await request.json());
    const user = await acceptInvite(body.token, body.name, body.password);
    return ok("Invite accepted.", { user });
  } catch (error) {
    return routeError(error);
  }
}
