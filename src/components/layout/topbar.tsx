"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Menu, Plus } from "lucide-react";
import { findNavItem } from "@/components/layout/nav-items";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export function Topbar({ userName, role, onMenuClick }: {
  userName: string;
  role: string;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const isDetail = Boolean(current && pathname !== current.href);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--hover)] lg:hidden" onClick={onMenuClick} type="button">
            <Menu className="h-5 w-5" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="hidden text-[var(--muted-foreground)] hover:text-[var(--foreground)] sm:inline">OfficeFlow</Link>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--muted-foreground)] sm:inline" />
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={current?.href ?? pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex min-w-0 items-center gap-1.5"
              >
                {isDetail && current ? (
                  <>
                    <Link href={current.href} className="truncate text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{current.label}</Link>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    <span className="truncate font-medium text-[var(--heading)]">Details</span>
                  </>
                ) : (
                  <span className="truncate font-medium text-[var(--heading)]">{current?.label ?? "Workspace"}</span>
                )}
              </motion.span>
            </AnimatePresence>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="mr-1 hidden sm:inline-flex">
            <Link href="/expenses?new=1"><Plus className="h-4 w-4" />Create expense</Link>
          </Button>
          <Button asChild size="sm" className="mr-1 w-8 px-0 sm:hidden" aria-label="Create expense">
            <Link href="/expenses?new=1"><Plus className="h-4 w-4" /></Link>
          </Button>
          <ThemeToggle />
          <NotificationBell />
          <UserMenu role={role} userName={userName} />
        </div>
      </div>
    </header>
  );
}
