import { AppShell } from "@/components/layout/app-shell";
import { Role } from "@prisma/client";
import type { BirthdayInfo } from "@/lib/services/birthday-service";

export function PageShell({
  role,
  userId,
  userName,
  title,
  birthdays,
  initialCollapsed,
  children
}: {
  role: Role;
  userId: string;
  userName: string;
  title: string;
  birthdays: BirthdayInfo | null;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AppShell birthdays={birthdays} initialCollapsed={initialCollapsed} role={role} title={title} userId={userId} userName={userName}>
      {children}
    </AppShell>
  );
}
