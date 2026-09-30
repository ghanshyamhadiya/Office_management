import { cn } from "@/lib/utils/cn";

export function PageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <p className="text-xs font-medium text-[var(--muted-foreground)]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--heading)]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
