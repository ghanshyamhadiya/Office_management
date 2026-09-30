import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { tripSchema } from "@/lib/validators/trips";
import { createTrip, listTrips } from "@/lib/services/trip-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET() {
  try {
    const session = await requireSession();
    const trips = await listTrips({ userId: session.user.id, role: session.user.role });
    return ok("Trips fetched.", trips);
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = tripSchema.parse(await request.json());
    const trip = await createTrip(session.user.id, body);
    return ok("Trip created.", trip);
  } catch (error) {
    return routeError(error);
  }
}
