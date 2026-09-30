"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, MailCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/button-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteSchema } from "@/lib/validators/auth";

type Values = z.infer<typeof acceptInviteSchema>;

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { token, name: "", password: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const payload = await response.json();
    if (!response.ok) {
      setServerError(payload.message);
      toast.error(payload.message);
      return;
    }
    toast.success(payload.message);
    router.push("/login");
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Complete your setup to activate the invited account and start using the workspace.
      </div>
      {serverError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div> : null}
      <input type="hidden" {...form.register("token")} />

      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" id="name" placeholder="Enter your full name" {...form.register("name")} />
        </div>
        {form.formState.errors.name ? <p className="text-sm text-rose-600">{form.formState.errors.name.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Choose a password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9 pr-12" id="password" placeholder="Create a secure password" type={showPassword ? "text" : "password"} {...form.register("password")} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" onClick={() => setShowPassword((value) => !value)} type="button">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.password ? <p className="text-sm text-rose-600">{form.formState.errors.password.message}</p> : null}
      </div>

      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
        <div className="flex items-start gap-2">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your invite token is already attached to this page. Submit once to finish account creation.</span>
        </div>
      </div>

      <PrimaryButton className="w-full" type="submit">
        {form.formState.isSubmitting ? "Creating account..." : "Create account"}
      </PrimaryButton>
    </form>
  );
}
