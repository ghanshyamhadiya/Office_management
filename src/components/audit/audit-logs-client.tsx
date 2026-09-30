"use client";

import * as React from "react";
import {
  Activity,
  Clock3,
  Filter,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { DataTableShell } from "@/components/layout/data-table-shell";
import { FilterToolbar } from "@/components/layout/filter-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/layout/stats-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { TBody, TD, TH, THead, Table, TR } from "@/components/ui/table";

type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  targetUserId: string | null;
  metadata: unknown;
  createdAt: Date | string;
  actor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type TargetUser = {
  id: string;
  name: string | null;
  email: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function formatDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function prettifyLabel(value: string) {
  return value.replaceAll("_", " ");
}

function summarizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "—";
  }

  const entries = Object.entries(value as Record<string, unknown>).slice(0, 2);
  if (entries.length === 0) return "—";

  return entries
    .map(([key, entryValue]) => `${prettifyLabel(key)}: ${String(entryValue)}`)
    .join(" · ");
}

export function AuditLogsClient({
  logs,
  targets,
}: {
  logs: AuditLogItem[];
  targets: TargetUser[];
}) {
  const [actorFilter, setActorFilter] = React.useState("ALL");
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 20;
  const debouncedSearch = useDebouncedValue(search);

  const actorOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          logs
            .filter((log) => log.actor)
            .map((log) => [
              log.actor!.id,
              { id: log.actor!.id, label: log.actor!.name || log.actor!.email },
            ]),
        ).values(),
      ),
    [logs],
  );

  const actionOptions = React.useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const entityOptions = React.useMemo(
    () => Array.from(new Set(logs.map((log) => log.entityType))).sort(),
    [logs],
  );

  const targetMap = React.useMemo(
    () => new Map(targets.map((target) => [target.id, target])),
    [targets],
  );

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (actorFilter !== "ALL" && log.actorId !== actorFilter) return false;
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (entityFilter !== "ALL" && log.entityType !== entityFilter) return false;

      const timestamp = new Date(log.createdAt);
      if (fromDate) {
        const from = new Date(fromDate);
        if (timestamp < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (timestamp > to) return false;
      }

      if (debouncedSearch.trim()) {
        const haystack = [
          log.actor?.name,
          log.actor?.email,
          log.action,
          log.entityType,
          log.entityId,
          targetMap.get(log.targetUserId || "")?.name,
          targetMap.get(log.targetUserId || "")?.email,
          summarizeMetadata(log.metadata),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(debouncedSearch.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [actionFilter, actorFilter, debouncedSearch, entityFilter, fromDate, logs, targetMap, toDate]);

  React.useEffect(() => {
    setPage(1);
  }, [actorFilter, actionFilter, debouncedSearch, entityFilter, fromDate, toDate]);

  const pages = Math.max(1, Math.ceil(filteredLogs.length / limit));
  const pagedLogs = filteredLogs.slice((page - 1) * limit, page * limit);

  const summary = React.useMemo(
    () => ({
      total: logs.length,
      visible: filteredLogs.length,
      actors: actorOptions.length,
      entities: entityOptions.length,
    }),
    [actorOptions.length, entityOptions.length, filteredLogs.length, logs.length],
  );

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Security"
        title="Audit Logs"
        description="Review administrative activity, trace who changed what, and scan sensitive events with a cleaner operational view."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total events" value={summary.total} hint="Loaded for admin review" icon={<Activity className="h-5 w-5" />} />
        <StatsCard label="Visible events" value={summary.visible} hint="Current filtered view" icon={<Filter className="h-5 w-5" />} />
        <StatsCard label="Actors" value={summary.actors} hint="Distinct users in range" icon={<UserRound className="h-5 w-5" />} />
        <StatsCard label="Entity groups" value={summary.entities} hint="Audited resource types" icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <p className="text-sm text-slate-500">Narrow by actor, action, entity, date window, or keyword to find the right event trail quickly.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-md px-3 text-slate-600"
            onClick={() => {
              setActorFilter("ALL");
              setActionFilter("ALL");
              setEntityFilter("ALL");
              setFromDate("");
              setToDate("");
              setSearch("");
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Actor</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
            >
              <option value="ALL">All actors</option>
              {actorOptions.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Action</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              <option value="ALL">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {prettifyLabel(action)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Entity type</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
            >
              <option value="ALL">All entities</option>
              {entityOptions.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">From</span>
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">To</span>
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Action, actor, metadata" />
            </div>
          </label>
        </div>
      </FilterToolbar>

      <DataTableShell
        title="Audit events"
        description="Scan actor, action, target, and metadata context from a single review table."
      >
        {!logs.length ? (
          <div className="p-6">
            <EmptyState
              title="No audit logs found"
              description="Audited activity will appear here once actions are recorded in the system."
            />
          </div>
        ) : !filteredLogs.length ? (
          <div className="p-6">
            <EmptyState
              title="No audit logs match these filters"
              description="Try broadening the date range or clearing some filters."
              icon={<Search className="h-6 w-6" />}
            />
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <div className="max-h-[720px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Actor</TH>
                      <TH>Event</TH>
                      <TH>Entity</TH>
                      <TH>Target</TH>
                      <TH>Metadata</TH>
                      <TH className="text-right">Timestamp</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {pagedLogs.map((log) => {
                      const target = log.targetUserId ? targetMap.get(log.targetUserId) : null;

                      return (
                        <TR key={log.id}>
                          <TD>
                            <div className="space-y-1">
                              <p className="font-medium text-slate-950">{log.actor?.name || "System"}</p>
                              <p className="text-xs text-slate-500">{log.actor?.email || "Automated action"}</p>
                            </div>
                          </TD>
                          <TD>
                            <div className="space-y-2">
                              <StatusBadge status={log.action} className="capitalize" />
                              <p className="text-xs text-slate-500">{prettifyLabel(log.action)}</p>
                            </div>
                          </TD>
                          <TD>
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{log.entityType}</p>
                              <p className="text-xs text-slate-500">{log.entityId || "—"}</p>
                            </div>
                          </TD>
                          <TD>
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{target?.name || target?.email || "—"}</p>
                              <p className="text-xs text-slate-500">{target?.email || log.targetUserId || "No target user"}</p>
                            </div>
                          </TD>
                          <TD className="max-w-[280px]">
                            <p className="line-clamp-2 text-sm leading-6 text-slate-600">{summarizeMetadata(log.metadata)}</p>
                          </TD>
                          <TD className="text-right">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-950">{formatDate(log.createdAt)}</p>
                              <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Clock3 className="h-3.5 w-3.5" />
                                Recorded
                              </div>
                            </div>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {pages} · {filteredLogs.length.toLocaleString("en-IN")} matching events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md"
                  disabled={page >= pages}
                  onClick={() => setPage((current) => Math.min(pages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </DataTableShell>
    </div>
  );
}
