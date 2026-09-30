import { Role } from "@prisma/client";

export function isAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function isManagerOrAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw new Error("FORBIDDEN");
  }
}

export function canManageUser(actorRole: Role, _actorId?: string, _targetManagerId?: string | null, _targetUserId?: string) {
  return actorRole === "SUPER_ADMIN";
}
