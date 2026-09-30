import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-slate-50/75">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4" key={index}>
            <div className="grid gap-3 md:grid-cols-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
