"use client";

import { AnimatePresence, motion } from "framer-motion";
import { duration, spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function DrawerShell({
  open,
  children,
  className
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: duration.fast }}
        >
          <motion.div
            animate={{ x: 0 }}
            className={cn("absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-white p-6 shadow-[var(--shadow-lg)]", className)}
            exit={{ x: "100%" }}
            initial={{ x: "100%" }}
            transition={spring.drawer}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
