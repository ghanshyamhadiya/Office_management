import { LeaveRequestStatus, OtherLeaveStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { computeLeaveDays, deriveLeaveBalance, nextUsedDaysForApproval } from "@/lib/services/leave-rules";
import { createAuditLog } from "@/lib/audit";
import { canManageUser } from "@/lib/permissions";

export async function getLeaveTypes() {
  return prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getLeaveBalanceForUser(viewer: { userId: string; role: Role }, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (viewer.role === "EMPLOYEE" && viewer.userId !== userId) {
    throw new Error("FORBIDDEN");
  }
  if (viewer.role === "MANAGER" && !canManageUser(viewer.role, viewer.userId, user.managerId, user.id)) {
    throw new Error("FORBIDDEN");
  }

  const balances = await prisma.leaveBalance.findMany({
    where: { userId },
    include: { leaveType: true }
  });

  return balances.map((balance) => ({
    ...balance,
    summary: deriveLeaveBalance(balance.baseDays, balance.extraDays, balance.usedDays)
  }));
}

export async function createLeaveRequest(userId: string, data: { leaveTypeId: string; startDate: string; endDate: string; reason: string }) {
  const totalDays = computeLeaveDays(new Date(data.startDate), new Date(data.endDate));
  return prisma.leaveRequest.create({
    data: {
      userId,
      leaveTypeId: data.leaveTypeId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalDays,
      reason: data.reason
    }
  });
}

export async function reviewLeaveRequest(reviewer: { userId: string; role: Role }, requestId: string, status: LeaveRequestStatus, note: string) {
  const request = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { user: true }
  });

  if (reviewer.role === "MANAGER" && request.user.managerId !== reviewer.userId) {
    throw new Error("FORBIDDEN");
  }

  if (status === "APPROVED") {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.leaveBalance.findFirstOrThrow({
        where: {
          userId: request.userId,
          leaveTypeId: request.leaveTypeId,
          year: request.startDate.getFullYear()
        }
      });

      const nextUsed = nextUsedDaysForApproval(balance.usedDays, request.totalDays, status);
      const available = balance.baseDays + balance.extraDays - balance.usedDays;
      if (available < request.totalDays) {
        throw new Error("Insufficient leave balance.");
      }

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { usedDays: nextUsed }
      });

      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { status, reviewNote: note, reviewedById: reviewer.userId, reviewedAt: new Date() }
      });
    });
  } else {
    await prisma.leaveRequest.update({
      where: { id: request.id },
      data: { status, reviewNote: note, reviewedById: reviewer.userId, reviewedAt: new Date() }
    });
  }

  await createAuditLog({
    actorId: reviewer.userId,
    action: status === "APPROVED" ? "leave_approved" : "leave_rejected",
    entityType: "LeaveRequest",
    entityId: request.id,
    targetUserId: request.userId
  });
}

export async function createOtherLeaveRequest(userId: string, data: { title: string; startDate: string; endDate: string; reason: string }) {
  const totalDays = computeLeaveDays(new Date(data.startDate), new Date(data.endDate));
  return prisma.otherLeaveRequest.create({
    data: {
      userId,
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalDays,
      reason: data.reason
    }
  });
}

export async function reviewOtherLeaveRequest(reviewer: { userId: string; role: Role }, requestId: string, status: OtherLeaveStatus, note: string) {
  const request = await prisma.otherLeaveRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { user: true }
  });
  if (reviewer.role === "MANAGER" && request.user.managerId !== reviewer.userId) {
    throw new Error("FORBIDDEN");
  }

  await prisma.otherLeaveRequest.update({
    where: { id: requestId },
    data: { status, reviewNote: note, reviewedById: reviewer.userId, reviewedAt: new Date() }
  });

  await createAuditLog({
    actorId: reviewer.userId,
    action: status === "APPROVED" ? "other_leave_approved" : "other_leave_rejected",
    entityType: "OtherLeaveRequest",
    entityId: requestId,
    targetUserId: request.userId
  });
}

export async function addExtraLeaves(actor: { userId: string; role: Role }, userId: string, leaveTypeId: string, year: number, days: number, reason: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (actor.role === "MANAGER" && user.managerId !== actor.userId) {
    throw new Error("FORBIDDEN");
  }

  const balance = await prisma.leaveBalance.upsert({
    where: {
      userId_leaveTypeId_year: {
        userId,
        leaveTypeId,
        year
      }
    },
    update: { extraDays: { increment: days } },
    create: {
      userId,
      leaveTypeId,
      year,
      baseDays: 12,
      extraDays: days
    }
  });

  await createAuditLog({
    actorId: actor.userId,
    action: "extra_leaves_added",
    entityType: "LeaveBalance",
    entityId: balance.id,
    targetUserId: userId,
    metadata: { days, reason }
  });

  return balance;
}
