import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getBirthdayInfo, type BirthdayInfo } from "@/lib/services/birthday-service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/");

  const [birthdays, jar] = await Promise.all([
    getBirthdayInfo(session.user.id).catch((error): BirthdayInfo | null => {
      console.error("Failed to load birthdays", error);
      return null;
    }),
    cookies(),
  ]);

  return (
    <PageShell
      birthdays={birthdays}
      initialCollapsed={jar.get("officeflow-sidebar")?.value === "collapsed"}
      role={session.user.role}
      title="OfficeFlow"
      userId={session.user.id}
      userName={session.user.name}
    >
      {children}
    </PageShell>
  );
}
