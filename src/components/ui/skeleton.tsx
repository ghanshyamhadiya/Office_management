import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-[var(--muted)]", className)} {...props}>
      <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--surface)_70%,transparent),transparent)] [animation:skeleton-shimmer_1.4s_ease-in-out_infinite]" />
    </div>
  );
}
