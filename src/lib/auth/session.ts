import { cache } from "react";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";

export const getCurrentSession = cache(async function getCurrentSession() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  let payload;
  try {
    payload = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user || !user.isActive) return null;
  // The Manager role is retired: anyone still stored as MANAGER is treated as an Employee.
  return { payload, user: user.role === "MANAGER" ? { ...user, role: "EMPLOYEE" as const } : user };
});

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
