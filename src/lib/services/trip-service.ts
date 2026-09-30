import { Role, TripStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { toDecimal } from "@/lib/db/decimal";
import { calculateWorkingDays } from "@/lib/utils/dates";
import { createAuditLog } from "@/lib/audit";

export async function listTrips(session: { userId: string; role: Role }) {
  const where =
    session.role === "SUPER_ADMIN"
      ? {}
      : session.role === "MANAGER"
        ? { OR: [{ userId: session.userId }, { user: { managerId: session.userId } }] }
        : { userId: session.userId };

  return prisma.trip.findMany({
    where,
    include: { itinerary: true, user: true },
    orderBy: { departureDate: "desc" }
  });
}

export async function createTrip(userId: string, data: {
  title: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  estimatedBudget: number;
  itinerary: Array<{ dayNumber: number; date: string; activities: string; notes?: string | null }>;
}) {
  const departureDate = new Date(data.departureDate);
  const returnDate = new Date(data.returnDate);

  return prisma.trip.create({
    data: {
      userId,
      title: data.title,
      destination: data.destination,
      purpose: data.purpose,
      departureDate,
      returnDate,
      totalDays: calculateWorkingDays(departureDate, returnDate),
      estimatedBudget: toDecimal(data.estimatedBudget),
      itinerary: {
        create: data.itinerary.map((row) => ({
          dayNumber: row.dayNumber,
          date: new Date(row.date),
          activities: row.activities,
          notes: row.notes ?? null
        }))
      }
    },
    include: { itinerary: true }
  });
}

export async function updateTrip(session: { userId: string; role: Role }, tripId: string, data: {
  title: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  estimatedBudget: number;
  itinerary: Array<{ dayNumber: number; date: string; activities: string; notes?: string | null }>;
}) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  if (session.role === "EMPLOYEE" && trip.userId !== session.userId) {
    throw new Error("FORBIDDEN");
  }
  if (trip.status !== "PENDING") {
    throw new Error("Only pending trips can be edited.");
  }

  const departureDate = new Date(data.departureDate);
  const returnDate = new Date(data.returnDate);

  return prisma.$transaction(async (tx) => {
    await tx.tripItinerary.deleteMany({ where: { tripId } });
    return tx.trip.update({
      where: { id: tripId },
      data: {
        title: data.title,
        destination: data.destination,
        purpose: data.purpose,
        departureDate,
        returnDate,
        totalDays: calculateWorkingDays(departureDate, returnDate),
        estimatedBudget: toDecimal(data.estimatedBudget),
        itinerary: {
          create: data.itinerary.map((row) => ({
            dayNumber: row.dayNumber,
            date: new Date(row.date),
            activities: row.activities,
            notes: row.notes ?? null
          }))
        }
      },
      include: { itinerary: true }
    });
  });
}

export async function reviewTrip(actor: { userId: string; role: Role }, tripId: string, status: TripStatus, note: string) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: { user: true }
  });

  if (actor.role === "MANAGER" && trip.user.managerId !== actor.userId) {
    throw new Error("FORBIDDEN");
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status,
      reviewNote: note,
      reviewedById: actor.userId,
      reviewedAt: new Date()
    }
  });

  await createAuditLog({
    actorId: actor.userId,
    action: status === "APPROVED" ? "trip_approved" : "trip_rejected",
    entityType: "Trip",
    entityId: tripId,
    targetUserId: trip.userId
  });

  return updated;
}

export async function completeTrip(actor: { userId: string; role: Role }, tripId: string) {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "COMPLETED", completedAt: new Date() }
  });
  await createAuditLog({
    actorId: actor.userId,
    action: "trip_completed",
    entityType: "Trip",
    entityId: tripId,
    targetUserId: trip.userId
  });
  return trip;
}

export async function cancelTrip(actor: { userId: string; role: Role }, tripId: string) {
  const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
  if (actor.userId !== trip.userId) {
    throw new Error("FORBIDDEN");
  }
  if (!["PENDING", "APPROVED"].includes(trip.status)) {
    throw new Error("Trip cannot be cancelled.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const tripRecord = await tx.trip.update({
      where: { id: tripId },
      data: { status: "CANCELLED", cancelledAt: new Date() }
    });

    await tx.expense.updateMany({
      where: { tripId, expenseType: "TRIP", isSettled: false, archivedAt: null },
      data: {
        archivedAt: new Date(),
        archivedById: actor.userId,
        archivedReason: "Trip cancelled"
      }
    });

    return tripRecord;
  });

  await createAuditLog({
    actorId: actor.userId,
    action: "trip_cancelled",
    entityType: "Trip",
    entityId: tripId,
    targetUserId: trip.userId
  });

  return updated;
}
