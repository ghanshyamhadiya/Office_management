import { z } from "zod";

export const itineraryRowSchema = z.object({
  dayNumber: z.coerce.number().int().positive(),
  date: z.string(),
  activities: z.string().min(2).max(500),
  notes: z.string().max(500).optional().nullable()
});

export const tripSchema = z.object({
  title: z.string().min(3).max(150),
  destination: z.string().min(2).max(150),
  purpose: z.string().min(5).max(500),
  departureDate: z.string(),
  returnDate: z.string(),
  estimatedBudget: z.coerce.number().nonnegative(),
  itinerary: z.array(itineraryRowSchema).min(1)
});

export const tripReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().min(3).max(500)
});
