"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Role } from "@prisma/client";
import { BirthdayCelebration } from "@/components/celebration/birthday-celebration";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { ease } from "@/components/motion/tokens";
import type { BirthdayInfo } from "@/lib/services/birthday-service";

const SIDEBAR_COOKIE = "officeflow-sidebar";

export function AppShell({ role, userId, userName, birthdays, initialCollapsed = false, children }: {
  role: Role;
  userId: string;
  userName: string;
  title?: string;
  birthdays: BirthdayInfo | null;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const reduced = useReducedMotion();

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="app-frame flex min-h-screen">
      <a href="#workspace-content" className="sr-only z-[80] rounded-md bg-[var(--surface)] p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:block"
      >
        <SidebarNav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} role={role} />
      </motion.aside>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-40 bg-[rgba(9,30,66,0.54)]" />
          <DialogPrimitive.Content aria-describedby={undefined} className="mobile-navigation fixed inset-y-0 left-0 z-50 w-[280px] max-w-[88vw] border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-[var(--shadow-lg)] outline-none">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close navigation" className="absolute right-2 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--hover)]">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <SidebarNav layoutId="mobile-sidebar" onNavigate={() => setMobileOpen(false)} role={role} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} role={role} userName={userName} />
        <main id="workspace-content" tabIndex={-1} className="flex-1 px-4 pb-12 pt-6 outline-none lg:px-8 lg:pt-8">
          {birthdays ? <div className="content-shell"><BirthdayCelebration info={birthdays} userId={userId} userName={userName} /></div> : null}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: ease.out }}
            className="content-shell page-stack"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
