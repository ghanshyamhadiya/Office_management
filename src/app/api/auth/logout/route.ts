import { logout } from "@/lib/services/auth-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST() {
  try {
    await logout();
    return ok("Logout successful.");
  } catch (error) {
    return routeError(error);
  }
}
