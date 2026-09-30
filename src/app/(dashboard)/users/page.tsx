import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { UsersClient } from "@/components/users/users-client";

export default async function UsersPage() {
  const session = await requireSession();

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <UsersClient role={session.user.role} userId={session.user.id} />;
}
