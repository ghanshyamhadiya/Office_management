"use client";

import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, KeyRound, Loader2, LogOut, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/components/layout/nav-items";

const itemClass =
  "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded px-2.5 text-sm text-[var(--foreground)] outline-none data-[highlighted]:bg-[var(--hover)]";

export function UserMenu({ userName, role }: { userName: string; role: string }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      window.location.replace("/");
    } catch (error) {
      setSigningOut(false);
      toast.error(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="flex h-9 items-center gap-2 rounded-md pl-1 pr-2 text-sm outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] data-[state=open]:bg-[var(--hover)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[var(--primary-foreground)]">
          {getInitials(userName)}
        </span>
        <span className="hidden max-w-[140px] truncate font-medium text-[var(--heading)] md:inline">{userName}</span>
        <ChevronDown className="hidden h-4 w-4 text-[var(--muted-foreground)] md:inline" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="dropdown-content z-50 w-60 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-[var(--shadow-lg)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-[var(--heading)]">{userName}</p>
            <p className="text-xs capitalize text-[var(--muted-foreground)]">{role === "SUPER_ADMIN" ? "Admin" : "Employee"}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/profile"><UserCircle2 className="h-4 w-4 text-[var(--muted-foreground)]" />Profile & notifications</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/change-password"><KeyRound className="h-4 w-4 text-[var(--muted-foreground)]" />Change password</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item
            className={itemClass}
            disabled={signingOut}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 text-[var(--muted-foreground)]" />}
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
