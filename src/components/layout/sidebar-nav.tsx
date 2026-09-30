"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Role } from "@prisma/client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { BrandMark, BrandName } from "@/components/layout/brand";
import { getNavGroups } from "@/components/layout/nav-items";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils/cn";

const fade = { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -4 }, transition: { duration: 0.15 } };

export function SidebarNav({
  role,
  layoutId = "sidebar",
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  role: Role;
  userName?: string;
  layoutId?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = getNavGroups(role);

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex h-full flex-col">
        <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--sidebar-border)]", collapsed ? "justify-center px-2" : "px-4")}>
          <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5" aria-label="OfficeFlow dashboard">
            <BrandMark />
            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.span {...fade} className="min-w-0">
                  <BrandName className="block leading-tight" />
                  <span className="block text-[11px] leading-tight text-[var(--sidebar-muted)]">Expense workspace</span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-2 py-4">
          {groups.map(({ group, items }) => (
            <div key={group}>
              {collapsed ? <div className="mx-2 mb-2 border-t border-[var(--sidebar-border)] first:hidden" /> : <p className="nav-group-label">{group}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        collapsed ? "justify-center px-0" : "px-2.5",
                        active ? "text-[var(--accent-foreground)]" : "text-[var(--sidebar-foreground)] hover:bg-[var(--hover)] hover:text-[var(--heading)]"
                      )}
                    >
                      {active ? (
                        <motion.span layoutId={`${layoutId}-active`} transition={spring.snappy} className="absolute inset-0 rounded-md bg-[var(--sidebar-accent)]">
                          <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--primary)]" />
                        </motion.span>
                      ) : null}
                      <Icon className="relative h-[18px] w-[18px] shrink-0" />
                      <AnimatePresence initial={false}>
                        {!collapsed ? <motion.span {...fade} className="relative truncate">{item.label}</motion.span> : null}
                      </AnimatePresence>
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content side="right" sideOffset={8} className="dropdown-content z-50 rounded-md bg-[var(--heading)] px-2 py-1 text-xs font-medium text-[var(--background)]">
                              {item.label}
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      ) : link}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {onToggleCollapsed ? (
          <div className="shrink-0 border-t border-[var(--sidebar-border)] p-2">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className={cn("flex h-9 w-full items-center gap-3 rounded-md text-sm text-[var(--sidebar-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--heading)]", collapsed ? "justify-center" : "px-2.5")}
            >
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
              <AnimatePresence initial={false}>{!collapsed ? <motion.span {...fade}>Collapse</motion.span> : null}</AnimatePresence>
            </button>
          </div>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}
