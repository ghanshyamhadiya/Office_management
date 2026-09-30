import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded border border-transparent bg-slate-100 px-1.5 text-[11px] font-bold uppercase tracking-[0.02em] text-slate-700", className)}
      {...props}
    />
  );
}
