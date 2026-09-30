import { LeaveRequestStatus } from "@prisma/client";
import { calculateWorkingDays } from "@/lib/utils/dates";

export function computeLeaveDays(startDate: Date, endDate: Date) {
  return calculateWorkingDays(startDate, endDate);
}

export function deriveLeaveBalance(baseDays: number, extraDays: number, usedDays: number) {
  const total = baseDays + extraDays;
  return {
    total,
    used: usedDays,
    remaining: total - usedDays
  };
}

export function nextUsedDaysForApproval(currentUsedDays: number, requestDays: number, status: LeaveRequestStatus) {
  return status === "APPROVED" ? currentUsedDays + requestDays : currentUsedDays;
}
