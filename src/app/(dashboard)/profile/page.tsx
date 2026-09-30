import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getInitials } from "@/components/layout/nav-items";
import { NotificationSettingsCard } from "@/components/notifications/notification-settings-card";
import { SecondaryButton } from "@/components/ui/button-patterns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/auth/session";

export default async function ProfilePage() {
  const session = await requireSession();
  const { user } = session;
  const rows = [
    { label: "Full name", value: user.name },
    { label: "Work email", value: user.email },
    { label: "Birthday", value: user.birthday ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long" }).format(user.birthday) : "—" },
    { label: "Member since", value: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(user.createdAt) },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <SecondaryButton asChild>
            <Link href="/change-password">
              <KeyRound className="h-4 w-4" />
              Change password
            </Link>
          </SecondaryButton>
        }
        description="Your account details and access level."
        eyebrow="Account"
        title="Profile"
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--secondary)] text-2xl font-medium text-[var(--primary)]">
              {getInitials(user.name)}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-950">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <StatusBadge status={user.role === "SUPER_ADMIN" ? "Admin" : "Employee"} />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle>Account details</CardTitle>
            <CardDescription>Contact an administrator to update these details.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {rows.map((row) => (
              <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between" key={row.label}>
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className="text-sm font-medium text-slate-900">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <NotificationSettingsCard />
    </div>
  );
}
