import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { features } from "@/lib/features";
import { LeaveClient } from "@/components/leave/leave-client";

export default async function LeavePage() {
  if (!features.leave) redirect("/dashboard");

  const session = await requireSession();

  return <LeaveClient role={session.user.role} />;
}
