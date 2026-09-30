import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

export function DataTableShell({
  title,
  description,
  toolbar,
  footer,
  emptyTitle,
  emptyDescription,
  isEmpty,
  children,
  className
}: {
  title?: string;
  description?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {title || description ? (
        <CardHeader className="border-b border-[var(--border)]">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      {toolbar ? <div className="border-b border-[var(--border)] px-5 py-3">{toolbar}</div> : null}
      <CardContent className="p-0">
        {isEmpty ? (
          <div className="p-5">
            <EmptyState description={emptyDescription ?? "No records matched the current view."} title={emptyTitle ?? "Nothing here yet"} />
          </div>
        ) : (
          <div className="p-4">{children}</div>
        )}
      </CardContent>
      {footer ? <div className="border-t border-[var(--border)] px-5 py-3">{footer}</div> : null}
    </Card>
  );
}
