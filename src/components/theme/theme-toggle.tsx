"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/components/theme/theme";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <motion.button
      aria-label={label}
      aria-pressed={isDark}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className
      )}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTheme(isDark ? "light" : "dark", { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      title={label}
      type="button"
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          className="flex"
          exit={{ opacity: 0, rotate: isDark ? -90 : 90, scale: 0.5, y: 6 }}
          initial={{ opacity: 0, rotate: isDark ? 90 : -90, scale: 0.5, y: -6 }}
          key={theme}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
