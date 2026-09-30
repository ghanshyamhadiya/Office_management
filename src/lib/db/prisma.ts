import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { env } from "@/lib/env";

neonConfig.webSocketConstructor = WebSocket;

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 30_000 }),
    omit: { user: { passwordHash: true } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

declare global {
  var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
