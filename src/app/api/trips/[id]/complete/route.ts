import { requireRole, routeError } from "@/lib/utils/route";
import { completeTrip } from "@/lib/services/trip-service";
import { ok } from "@/lib/utils/api";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const trip = await completeTrip({ userId: session.user.id, role: session.user.role }, id);
    return ok("Trip completed.", trip);
  } catch (error) {
    return routeError(error);
  }
}
