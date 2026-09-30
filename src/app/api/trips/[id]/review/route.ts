import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { tripReviewSchema } from "@/lib/validators/trips";
import { reviewTrip } from "@/lib/services/trip-service";
import { ok } from "@/lib/utils/api";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = tripReviewSchema.parse(await request.json());
    const trip = await reviewTrip({ userId: session.user.id, role: session.user.role }, id, body.status, body.note);
    return ok("Trip reviewed.", trip);
  } catch (error) {
    return routeError(error);
  }
}
