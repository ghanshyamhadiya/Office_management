import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { tripSchema } from "@/lib/validators/trips";
import { cancelTrip, updateTrip } from "@/lib/services/trip-service";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { itinerary: true, user: true, reviewedBy: true }
    });
    return ok("Trip fetched.", trip);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = tripSchema.parse(await request.json());
    const trip = await updateTrip({ userId: session.user.id, role: session.user.role }, id, body);
    return ok("Trip updated.", trip);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const trip = await cancelTrip({ userId: session.user.id, role: session.user.role }, id);
    return ok("Trip cancelled.", trip);
  } catch (error) {
    return routeError(error);
  }
}
