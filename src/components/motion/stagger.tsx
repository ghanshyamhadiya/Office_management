"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/motion/tokens";

export function Stagger({
  stagger = 0.05,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; delay?: number }) {
  return <motion.div animate="show" initial="hidden" variants={staggerContainer(stagger, delay)} {...props} />;
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={fadeUp} {...props} />;
}
