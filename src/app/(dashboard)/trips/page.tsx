import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { features } from "@/lib/features";
import { TripsClient } from "@/components/trips/trips-client";

export default async function TripsPage() {
  if (!features.trips) redirect("/dashboard");

  const session = await requireSession();

  return <TripsClient role={session.user.role} userId={session.user.id} />;
}
