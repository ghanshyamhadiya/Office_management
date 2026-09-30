import { requireSession } from "@/lib/auth/session";
import { DashboardClient, type DashboardStats } from "@/components/dashboard/dashboard-client";
import { getDashboardStats } from "@/lib/services/dashboard-service";

export default async function DashboardPage() {
  const session = await requireSession();
  const scope = session.user.role === "SUPER_ADMIN" ? "all" : "me";

  // Render the first view with data already in place (no client-side loading flash).
  const initialStats: DashboardStats | null = await getDashboardStats({ userId: session.user.id, role: session.user.role }, scope)
    .then((stats) => JSON.parse(JSON.stringify(stats)) as DashboardStats)
    .catch((error) => {
      console.error("Failed to prefetch dashboard stats", error);
      return null;
    });

  return <DashboardClient initialStats={initialStats} role={session.user.role} userName={session.user.name} />;
}
