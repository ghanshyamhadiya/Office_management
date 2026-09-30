import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/layout/auth-shell";
import { getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect(session.user.mustChangePassword ? "/change-password" : "/dashboard");

  return (
    <AuthShell subtitle="Sign in with your work account to continue." title="Welcome back">
      <LoginForm />
    </AuthShell>
  );
}
