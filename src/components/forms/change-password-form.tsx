"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/button-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema } from "@/lib/validators/auth";

type Values = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch("/api/auth/change-password", {
      method: "PUT",
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
    window.location.replace("/dashboard");
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Update your password before continuing. This protects your account and unlocks the rest of the workspace.
      </div>
      {serverError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{serverError}</div> : null}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9 pr-12" id="currentPassword" type={showCurrent ? "text" : "password"} {...form.register("currentPassword")} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" onClick={() => setShowCurrent((value) => !value)} type="button">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.currentPassword ? <p className="text-sm text-rose-600">{form.formState.errors.currentPassword.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9 pr-12" id="newPassword" type={showNext ? "text" : "password"} {...form.register("newPassword")} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600" onClick={() => setShowNext((value) => !value)} type="button">
            {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.newPassword ? <p className="text-sm text-rose-600">{form.formState.errors.newPassword.message}</p> : null}
      </div>

      <PrimaryButton className="w-full" type="submit">
        {form.formState.isSubmitting ? "Updating..." : "Update password"}
      </PrimaryButton>
    </form>
  );
}
