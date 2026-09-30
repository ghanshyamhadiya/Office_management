import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      targetUserId: input.targetUserId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    }
  });
}
