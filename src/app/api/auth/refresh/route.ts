import { refreshSession } from "@/lib/services/auth-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST() {
  try {
    const user = await refreshSession();
    return ok("Session refreshed.", { user });
  } catch (error) {
    return routeError(error);
  }
}
