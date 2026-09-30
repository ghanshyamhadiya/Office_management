import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { AuthShell } from "@/components/layout/auth-shell";

export default function ChangePasswordPage() {
  return (
    <AuthShell
      asideDescription="Password updates are required before accessing the wider workspace whenever an account starts with a temporary credential."
      eyebrow="Account security"
      subtitle="Create a permanent password to continue into the OfficeFlow workspace."
      title="Change your password"
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
