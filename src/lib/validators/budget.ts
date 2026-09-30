import { z } from "zod";

export const budgetSchema = z.object({
  amount: z.coerce.number().positive(),
  effectiveFrom: z.string(),
  note: z.string().max(250).optional().nullable()
});

export const fundAdjustmentSchema = z.object({
  employeeId: z.string().min(1),
  amount: z.coerce.number(),
  reason: z.string().min(3).max(500)
});
