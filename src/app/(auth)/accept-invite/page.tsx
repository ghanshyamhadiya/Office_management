import { AcceptInviteForm } from "@/components/forms/accept-invite-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  return (
    <AuthShell
      asideDescription="Invited users complete onboarding here with a clean setup flow designed for internal access."
      eyebrow="Team onboarding"
      subtitle="Confirm your name, choose a password, and finish creating your account."
      title="Accept your invite"
    >
      <AcceptInviteForm token={params.token ?? ""} />
    </AuthShell>
  );
}
