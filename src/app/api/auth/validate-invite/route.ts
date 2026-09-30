import { NextRequest } from "next/server";
import { validateInvite } from "@/lib/services/user-service";
import { ok, fail } from "@/lib/utils/api";

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return fail("Invite token is required.", 400);
  const invite = await validateInvite(token);
  if (!invite) return fail("Invite invalid or expired.", 404);
  return ok("Invite valid.", invite);
}
