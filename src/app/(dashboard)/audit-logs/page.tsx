import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditLogsClient } from "@/components/audit/audit-logs-client";

export default async function AuditLogsPage() {
  const session = await requireSession();

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const targetIds = Array.from(new Set(logs.map((log) => log.targetUserId).filter(Boolean))) as string[];
  const targets = targetIds.length
    ? await prisma.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  return <AuditLogsClient logs={logs} targets={targets} />;
}
