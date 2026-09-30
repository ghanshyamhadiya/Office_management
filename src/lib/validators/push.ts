import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint."),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint."),
});
