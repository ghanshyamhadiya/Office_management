"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validators/auth";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  useEffect(() => {
    // Wake a scaled-to-zero database while the user is typing credentials,
    // and again if they return to a login tab that has been idle for a while.
    let lastWarm = 0;
    const warm = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastWarm < 4 * 60_000) return;
      lastWarm = Date.now();
      fetch("/api/health", { cache: "no-store" }).catch(() => undefined);
    };
    warm();
    document.addEventListener("visibilitychange", warm);
    window.addEventListener("focus", warm);
    return () => {
      document.removeEventListener("visibilitychange", warm);
      window.removeEventListener("focus", warm);
    };
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload.data?.user) {
        setServerError(payload?.message || "Sign-in could not be completed. Please try again.");
        return;
      }
      setRedirecting(true);
      window.location.replace(payload.data.user.mustChangePassword ? "/change-password" : "/dashboard");
    } catch {
      setServerError("Unable to connect. Check your connection and try again.");
    }
  });
  const busy = form.formState.isSubmitting || redirecting;
  const { errors } = form.formState;

  return (
    <form className="space-y-5" noValidate onSubmit={onSubmit} aria-busy={busy}>
      <AnimatePresence initial={false}>
        {serverError ? (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            role="alert"
            transition={{ duration: 0.2 }}
          >
            <p className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {serverError}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="space-y-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="username"
          autoFocus
          className="h-10"
          disabled={busy}
          id="email"
          placeholder="you@company.com"
          type="email"
          {...form.register("email")}
        />
        {errors.email ? <p id="email-error" className="text-xs text-[var(--destructive)]">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete="current-password"
            className="h-10 pr-10"
            disabled={busy}
            id="password"
            placeholder="Enter your password"
            type={showPassword ? "text" : "password"}
            {...form.register("password")}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? <p id="password-error" className="text-xs text-[var(--destructive)]">{errors.password.message}</p> : null}
      </div>

      <Button className="h-10 w-full" disabled={busy} type="submit">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {redirecting ? "Opening your workspace…" : busy ? "Signing in…" : "Sign in to OfficeFlow"}
      </Button>

      <p className="text-center text-xs text-[var(--muted-foreground)]">Forgot your password? Ask your workspace administrator to reset it.</p>
    </form>
  );
}
