import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit";
import { inviteExpiryDate } from "@/lib/utils/dates";
import { generateOpaqueToken, hashToken } from "@/lib/auth/crypto.server";
import { env } from "@/lib/env";
import { inviteEmailTemplate, sendMail, tempPasswordTemplate } from "@/lib/mail";
import { canManageUser } from "@/lib/permissions";

export async function getTeamIds(userId: string) {
  const team = await prisma.user.findMany({
    where: { managerId: userId, isActive: true },
    select: { id: true }
  });
  return team.map((item) => item.id);
}

export async function listUsers(session: { userId: string; role: Role }) {
  const where =
    session.role === "SUPER_ADMIN" ? {} : { id: session.userId };

  return prisma.user.findMany({
    where,

    orderBy: { createdAt: "desc" }
  });
}

export async function createUser(actorId: string, data: {
  name: string;
  email: string;
  role: Role;
  birthday?: string | null;
  tempPassword: string;
}) {
  const passwordHash = await hashPassword(data.tempPassword);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      managerId: null,
      birthday: data.birthday ? new Date(data.birthday) : null,
      passwordHash,
      mustChangePassword: true
    }
  });

  await sendMail({
    to: data.email,
    subject: "OfficeFlow account created",
    html: tempPasswordTemplate(data.name, data.email, data.tempPassword)
  });

  await createAuditLog({
    actorId,
    action: "user_created",
    entityType: "User",
    entityId: user.id,
    targetUserId: user.id
  });

  return user;
}

export async function updateUser(actor: { userId: string; role: Role }, userId: string, data: {
  name?: string;
  role?: Role;
  birthday?: string | null;
  isActive?: boolean;
}) {
  const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!canManageUser(actor.role)) {
    throw new Error("FORBIDDEN");
  }
  if (userId === actor.userId && ((data.role && data.role !== "SUPER_ADMIN") || data.isActive === false)) {
    throw new Error("You cannot remove your own admin access or deactivate your own account.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
      managerId: null,
      birthday: data.birthday ? new Date(data.birthday) : existing.birthday
    }
  });

  await createAuditLog({
    actorId: actor.userId,
    action: user.isActive ? "user_updated" : "user_deactivated",
    entityType: "User",
    entityId: user.id,
    targetUserId: user.id
  });

  return user;
}

export async function resetUserPassword(actorId: string, userId: string, newPassword: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: true
    }
  });

  await createAuditLog({
    actorId,
    action: "password_reset",
    entityType: "User",
    entityId: userId,
    targetUserId: userId
  });
}

export async function inviteUser(actorId: string, data: {
  email: string;
  role: Role;
  name?: string | null;
}) {
  const rawToken = generateOpaqueToken();
  const invite = await prisma.userInvite.create({
    data: {
      email: data.email,
      role: data.role,
      managerId: null,
      name: data.name ?? null,
      tokenHash: hashToken(rawToken),
      invitedById: actorId,
      expiresAt: inviteExpiryDate()
    }
  });

  const acceptUrl = `${env.APP_URL}/accept-invite?token=${rawToken}`;
  await sendMail({
    to: data.email,
    subject: "OfficeFlow invite",
    html: inviteEmailTemplate(data.name, acceptUrl)
  });

  await createAuditLog({
    actorId,
    action: "user_invited",
    entityType: "UserInvite",
    entityId: invite.id
  });

  return { invite, rawToken };
}

export async function acceptInvite(token: string, name: string, password: string) {
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashToken(token) }
  });

  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    throw new Error("Invite invalid or expired.");
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email: invite.email,
        role: invite.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EMPLOYEE",
        managerId: null,
        passwordHash: await hashPassword(password),
        mustChangePassword: false
      }
    });

    await tx.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), name }
    });

    return created;
  });

  await createAuditLog({
    actorId: user.id,
    action: "invite_accepted",
    entityType: "UserInvite",
    entityId: invite.id,
    targetUserId: user.id
  });

  return user;
}

export async function validateInvite(token: string) {
  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashToken(token) }
  });

  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
    return null;
  }

  return invite;
}
