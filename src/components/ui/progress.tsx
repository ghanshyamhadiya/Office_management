"use client";

import { motion } from "framer-motion";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function Progress({ value, tone = "auto", className }: { value: number; tone?: "auto" | "primary"; className?: string }) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const color =
    tone === "primary" || value < 80
      ? "bg-[var(--primary)]"
      : value < 100
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80", className)}
      role="progressbar"
    >
      <motion.div
        animate={{ width: `${clamped}%` }}
        className={cn("h-full rounded-full transition-colors duration-300", color)}
        initial={{ width: 0 }}
        transition={spring.soft}
      />
    </div>
  );
}
