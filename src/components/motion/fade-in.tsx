"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { duration, ease } from "@/components/motion/tokens";

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
