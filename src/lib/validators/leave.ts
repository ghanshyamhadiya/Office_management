import { z } from "zod";

export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5).max(500)
});

export const otherLeaveRequestSchema = z.object({
  title: z.string().min(3).max(120),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5).max(500)
});

export const leaveReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().min(3).max(500)
});

export const extraLeaveSchema = z.object({
  leaveTypeId: z.string().min(1),
  year: z.coerce.number().int(),
  days: z.coerce.number().int().positive(),
  reason: z.string().min(3).max(500)
});
