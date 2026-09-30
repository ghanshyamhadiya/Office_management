"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { BrandMark, BrandName } from "@/components/layout/brand";
import { ease } from "@/components/motion/tokens";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const highlights = ["Submit and track expenses", "Monthly budget at a glance", "Employee fund and birthdays"];

export function AuthShell({ title, subtitle, eyebrow, children }: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: React.ReactNode;
  asideTitle?: string;
  asideDescription?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <main className="auth-backdrop relative flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <BrandName />
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: ease.out }}
          className="w-full max-w-[400px]"
        >
          <section aria-labelledby="auth-title" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-7 py-8 shadow-[var(--shadow-lg)] sm:px-9">
            <div className="mb-7 text-center">
              {eyebrow ? <p className="mb-2 text-xs font-medium text-[var(--primary)]">{eyebrow}</p> : null}
              <h1 id="auth-title" className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{subtitle}</p>
            </div>
            {children}
          </section>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
            className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted-foreground)]"
          >
            {highlights.map((item) => (
              <motion.li key={item} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>

      <footer className="pb-6 text-center text-xs text-[var(--muted-foreground)]">OfficeFlow · Internal office workspace</footer>
    </main>
  );
}
