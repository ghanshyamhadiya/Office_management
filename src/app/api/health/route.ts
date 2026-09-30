import { prisma } from "@/lib/db/prisma";
import { fail, ok } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok("Healthy.", { database: "up", latencyMs: Date.now() - startedAt });
  } catch (error) {
    console.error("Health check failed", error);
    return fail("Database unavailable.", 503, { database: "down", latencyMs: Date.now() - startedAt });
  }
}
