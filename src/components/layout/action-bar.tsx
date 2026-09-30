import { cn } from "@/lib/utils/cn";

export function ActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3 rounded-md bg-[var(--muted)] p-4 lg:flex-row lg:items-center lg:justify-between", className)}>{children}</div>;
}
