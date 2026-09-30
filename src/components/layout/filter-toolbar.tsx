import { cn } from "@/lib/utils/cn";

export function FilterToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]", className)}>
      {children}
    </div>
  );
}
