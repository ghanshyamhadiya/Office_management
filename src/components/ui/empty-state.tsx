"use client";

import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { duration, ease } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-6 py-10 text-center", className)}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: duration.base, ease: ease.out }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-5 text-[var(--muted-foreground)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </motion.div>
  );
}
