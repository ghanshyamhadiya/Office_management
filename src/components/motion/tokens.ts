import type { Transition, Variants } from "framer-motion";

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  soft: { type: "spring", stiffness: 260, damping: 30 },
  drawer: { type: "spring", stiffness: 380, damping: 38 },
} satisfies Record<string, Transition>;

export const duration = {
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: duration.base, ease: ease.out } },
};

export function staggerContainer(stagger = 0.05, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
