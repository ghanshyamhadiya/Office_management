import { cn } from "@/lib/utils/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 16.5 10 11l3.5 3.5L19 8" />
        <path d="M14.5 8H19v4.5" />
      </svg>
    </span>
  );
}

export function BrandName({ className }: { className?: string }) {
  return <span className={cn("text-[15px] font-semibold tracking-tight text-[var(--heading)]", className)}>OfficeFlow</span>;
}
