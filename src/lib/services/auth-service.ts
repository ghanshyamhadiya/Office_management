import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/tokens";
import { hashToken } from "@/lib/auth/crypto.server";
import { setAuthCookies, setAccessCookie, clearAuthCookies } from "@/lib/auth/cookies";
import { createAuditLog } from "@/lib/audit";
import { REFRESH_COOKIE } from "@/lib/auth/constants";
import { env } from "@/lib/env";

export async function login(email: string, password: string) {
  const record = await prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } });
  if (!record || !record.isActive) {
    throw new Error("Invalid credentials.");
  }

  const { passwordHash, ...user } = record;
  const valid = await verifyPassword(password, passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials.");
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    mustChangePassword: user.mustChangePassword
  });
  const refreshToken = await signRefreshToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    }
  });

  await setAuthCookies(accessToken, refreshToken);
  await createAuditLog({
    actorId: user.id,
    action: "login",
    entityType: "Auth",
    entityId: user.id,
    targetUserId: user.id
  });

  return user;
}

export async function logout() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken) },
      data: { revokedAt: new Date() }
    });
  }

  await clearAuthCookies();
}

export async function refreshSession() {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    throw new Error("No refresh token.");
  }

  const payload = await verifyRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true }
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error("Refresh token invalid.");
  }

  const newAccessToken = await signAccessToken({
    sub: stored.user.id,
    role: stored.user.role,
    email: stored.user.email,
    mustChangePassword: stored.user.mustChangePassword
  });
  const newRefreshToken = await signRefreshToken(payload);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        rotatedFrom: stored.id
      }
    })
  ]);

  await setAuthCookies(newAccessToken, newRefreshToken);
  return stored.user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, omit: { passwordHash: false } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false
    }
  });

  await setAccessCookie(await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    mustChangePassword: false,
  }));

  await createAuditLog({
    actorId: userId,
    action: "password_changed",
    entityType: "User",
    entityId: userId,
    targetUserId: userId
  });
}
