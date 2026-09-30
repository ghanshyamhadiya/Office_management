import { cn } from "@/lib/utils/cn";

export function SummaryCard({ label, value, hint, icon, className }: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group h-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-md)]", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--muted-foreground)]">{label}</p>
        {icon ? <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      </div>
      <div className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-[var(--heading)]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</div> : null}
    </div>
  );
}
