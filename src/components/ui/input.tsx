import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClass =
  "flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--muted-foreground)] hover:border-[color-mix(in_srgb,var(--input)_60%,var(--foreground)_40%)] focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--destructive)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClass, className)} {...props} />
);
Input.displayName = "Input";
