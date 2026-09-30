import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { authRateLimit } from "@/lib/auth/rate-limit";
import { login } from "@/lib/services/auth-service";
import { ok, fail } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const limited = await authRateLimit(`login:${body.email}`);
    if (!limited.success) return fail("Too many login attempts.", 429);
    const user = await login(body.email, body.password);
    return ok("Login successful.", { user });
  } catch (error) {
    return routeError(error);
  }
}
