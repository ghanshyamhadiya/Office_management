"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/components/notifications/use-push-notifications";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function NotificationBell() {
  const { status, busy, enable, disable } = usePushNotifications();

  if (status === "unsupported" || status === "unconfigured") return null;

  const on = status === "on";
  const label = on ? "Disable notifications" : status === "denied" ? "Notifications blocked in browser" : "Enable notifications";
  const Icon = busy || status === "loading" ? Loader2 : on ? BellRing : status === "denied" ? BellOff : Bell;

  return (
    <motion.button
      aria-label={label}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)] disabled:opacity-60",
        on && "text-[var(--primary)]"
      )}
      disabled={busy || status === "loading" || status === "denied"}
      onClick={() => (on ? disable() : enable())}
      title={label}
      type="button"
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, rotate: on ? [0, -18, 14, -8, 0] : 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          initial={{ opacity: 0, scale: 0.6 }}
          key={`${status}-${busy}`}
          transition={{ ...spring.snappy, rotate: { duration: 0.6 } }}
          className="flex"
        >
          <Icon className={cn("h-[18px] w-[18px]", (busy || status === "loading") && "animate-spin")} />
        </motion.span>
      </AnimatePresence>
      {status === "off" ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--surface)]" /> : null}
    </motion.button>
  );
}
