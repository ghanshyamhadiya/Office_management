import { ExpenseType } from "@prisma/client";
import { z } from "zod";

export const expenseSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(500).optional().nullable(),
  amount: z.coerce.number().positive(),
  expenseDate: z.string(),
  expenseType: z.nativeEnum(ExpenseType),
  tripId: z.string().optional().nullable()
});

export const settleExpenseSchema = z.object({
  isSettled: z.boolean()
});

export const archiveExpenseSchema = z.object({
  reason: z.string().min(3).max(250)
});

export const settleMonthSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000)
});
