import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required."),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters."),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters."),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive("ACCESS_TOKEN_TTL_MINUTES must be a positive integer."),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive("REFRESH_TOKEN_TTL_DAYS must be a positive integer."),
  APP_URL: z.string().url("APP_URL must be a valid URL."),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters."),
  MAIL_HOST: z.string().min(1, "MAIL_HOST is required."),
  MAIL_PORT: z.coerce.number().int().positive("MAIL_PORT must be a positive integer."),
  MAIL_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === "true"),
  MAIL_USER: z.string().min(1, "MAIL_USER is required."),
  MAIL_PASS: z.string().min(1, "MAIL_PASS is required."),
  MAIL_FROM: z.string().email("MAIL_FROM must be a valid email."),
  NEXT_PUBLIC_APP_NAME: z.string().default("OfficeFlow"),
  APP_TIMEZONE: z.string().default("Asia/Kolkata"),
  OFFICE_HOURS: z.string().regex(/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/, "OFFICE_HOURS must look like 10:00-20:00.").default("10:00-20:00"),
  OFFICE_DAYS: z.string().regex(/^[0-6](-[0-6])?(,[0-6](-[0-6])?)*$/, "OFFICE_DAYS must look like 1-5 or 1,2,3,4,5 (0 = Sunday).").default("1-5"),
  OFF_HOURS_WARM_INTERVAL_MINUTES: z.coerce.number().int().min(0).max(1440).default(30),
  KEEP_WARM_PING_MINUTES: z.coerce.number().int().min(1).max(60).default(4),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@officeflow.local")
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL_MINUTES: process.env.ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS,
  APP_URL: process.env.APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: process.env.MAIL_PORT,
  MAIL_SECURE: process.env.MAIL_SECURE,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,
  MAIL_FROM: process.env.MAIL_FROM,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  APP_TIMEZONE: process.env.APP_TIMEZONE || undefined,
  OFFICE_HOURS: process.env.OFFICE_HOURS || undefined,
  OFFICE_DAYS: process.env.OFFICE_DAYS || undefined,
  OFF_HOURS_WARM_INTERVAL_MINUTES: process.env.OFF_HOURS_WARM_INTERVAL_MINUTES || undefined,
  KEEP_WARM_PING_MINUTES: process.env.KEEP_WARM_PING_MINUTES || undefined,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || undefined,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || undefined
});

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

for (const [key, value] of [
  ["DATABASE_URL", parsed.data.DATABASE_URL],
  ["DIRECT_URL", parsed.data.DIRECT_URL]
] as const) {
  if (value.includes("USER:PASSWORD@HOST")) {
    throw new Error(`Invalid environment configuration:\n${key}: replace the placeholder connection string with your real Neon connection string.`);
  }
}

export const env = parsed.data;
