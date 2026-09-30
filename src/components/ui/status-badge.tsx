import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const variants: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  settled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  manager: "border-sky-200 bg-sky-50 text-sky-700",
  employee: "border-indigo-200 bg-indigo-50 text-indigo-700",
  "super admin": "border-violet-200 bg-violet-50 text-violet-700",
  admin: "border-violet-200 bg-violet-50 text-violet-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  archived: "border-slate-300 bg-slate-100 text-slate-700"
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return <Badge className={cn("border", variants[key] ?? "border-indigo-200 bg-indigo-50 text-indigo-700", className)}>{status.replaceAll("_", " ")}</Badge>;
}
