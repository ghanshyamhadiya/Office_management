import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { fail } from "@/lib/utils/api";
import { requireSession } from "@/lib/auth/session";

export async function getJson<T>(request: NextRequest): Promise<T> {
  return request.json();
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function routeError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues.map((issue) => issue.message).join("; "), 400);
  }

  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (!(error instanceof Error) || ["P1001", "P1002", "P1008", "P1017", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(code)) {
    return fail("The database connection is temporarily unavailable. Please try again.", 503);
  }

  const message = error.message;
  if (message === "UNAUTHORIZED") return fail("Unauthorized", 401);
  if (message === "FORBIDDEN") return fail("Forbidden", 403);
  if (message.includes("SMTP is not configured")) return fail(message, 500);
  return fail(message, 400);
}
