import { config as loadEnv } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Prisma, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import WebSocket from "ws";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set before running the seed.");
}

if (connectionString.includes("USER:PASSWORD@HOST")) {
  throw new Error("Replace DIRECT_URL or DATABASE_URL in .env/.env.local with your real Neon connection string before running the seed.");
}

neonConfig.webSocketConstructor = WebSocket;
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@officeflow.local";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Admin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Password123!";

// Non-destructive: creates the admin account and the employee fund record if they
// don't exist yet. Existing users and data are never deleted or changed.
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        role: Role.SUPER_ADMIN,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        mustChangePassword: false
      }
    });
  }

  await prisma.employeeFund.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", contributionAmount: new Prisma.Decimal(1200) }
  });

  console.info(existing ? `Admin already exists: ${ADMIN_EMAIL} (password unchanged)` : `Created admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.info("Employee fund ready. No other data was created or deleted.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
