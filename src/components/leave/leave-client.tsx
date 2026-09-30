"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BriefcaseMedical,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Eye,
  FilePlus2,
  MessageSquareQuote,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  XCircle,
} from "lucide-react";

import { DataTableShell } from "@/components/layout/data-table-shell";
import { FilterToolbar } from "@/components/layout/filter-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/layout/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TBody, TD, TH, THead, Table, TR } from "@/components/ui/table";

type Role = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
};

type LeaveBalance = {
  id: string;
  year: number;
  extraDays: number;
  usedDays: number;
  leaveType: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    used: number;
    remaining: number;
  };
};

type LeaveType = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

type AnnualRequest = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  leaveType?: {
    id: string;
    name: string;
  } | null;
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
  createdAt?: string;
};

type OtherLeaveRequest = {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
  createdAt?: string;
};

type UnifiedRequest = {
  id: string;
  kind: "ANNUAL" | "OTHER";
  title: string;
  subtitle: string;
  employeeName: string;
  employeeEmail: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: LeaveStatus;
  reason: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  raw: AnnualRequest | OtherLeaveRequest;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const defaultForm = {
  kind: "ANNUAL" as "ANNUAL" | "OTHER",
  leaveTypeId: "",
  title: "",
  startDate: "",
  endDate: "",
  reason: "",
};

async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function mapRequests(annual: AnnualRequest[], other: OtherLeaveRequest[]) {
  const annualItems: UnifiedRequest[] = annual.map((request) => ({
    id: request.id,
    kind: "ANNUAL",
    title: request.leaveType?.name || "Annual Leave",
    subtitle: "Annual leave",
    employeeName: request.user?.name || request.user?.email || "—",
    employeeEmail: request.user?.email || "—",
    startDate: request.startDate,
    endDate: request.endDate,
    totalDays: request.totalDays,
    status: request.status,
    reason: request.reason,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt,
    reviewedBy: request.reviewedBy?.name || request.reviewedBy?.email || null,
    raw: request,
  }));

  const otherItems: UnifiedRequest[] = other.map((request) => ({
    id: request.id,
    kind: "OTHER",
    title: request.title,
    subtitle: "Other leave",
    employeeName: request.user?.name || request.user?.email || "—",
    employeeEmail: request.user?.email || "—",
    startDate: request.startDate,
    endDate: request.endDate,
    totalDays: request.totalDays,
    status: request.status,
    reason: request.reason,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt,
    reviewedBy: request.reviewedBy?.name || request.reviewedBy?.email || null,
    raw: request,
  }));

  return [...annualItems, ...otherItems].sort((a, b) => {
    const left = new Date((a.raw as { createdAt?: string }).createdAt || a.startDate).getTime();
    const right = new Date((b.raw as { createdAt?: string }).createdAt || b.startDate).getTime();
    return right - left;
  });
}

function buildStatusSummary(items: UnifiedRequest[]) {
  return items.reduce(
    (acc, item) => {
      if (item.status === "PENDING") acc.pending += 1;
      if (item.status === "APPROVED") acc.approved += item.totalDays;
      if (item.status === "REJECTED") acc.rejected += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0 },
  );
}

export function LeaveClient({ role }: { role: Role }) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [activeKind, setActiveKind] = React.useState<"ALL" | "ANNUAL" | "OTHER">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | LeaveStatus>("ALL");
  const [detailRequest, setDetailRequest] = React.useState<UnifiedRequest | null>(null);
  const [createForm, setCreateForm] = React.useState(defaultForm);
  const [reviewNote, setReviewNote] = React.useState("");
  const [isExtraLeaveOpen, setIsExtraLeaveOpen] = React.useState(false);
  const [extraLeaveForm, setExtraLeaveForm] = React.useState({
    userId: "",
    leaveTypeId: "",
    year: new Date().getFullYear().toString(),
    days: "",
    reason: "",
  });

  const balancesQuery = useQuery({
    queryKey: ["leave-balances"],
    queryFn: async () => fetchJson<LeaveBalance[]>("/api/leave/balances/me"),
  });

  const leaveTypesQuery = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => fetchJson<LeaveType[]>("/api/leave/types"),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ["leave-users"],
    queryFn: async () => fetchJson<UserOption[]>("/api/users"),
    enabled: role !== "EMPLOYEE",
    staleTime: 60_000,
  });

  const annualRequestsQuery = useQuery({
    queryKey: ["leave-annual-requests"],
    queryFn: async () => fetchJson<AnnualRequest[]>("/api/leave/requests"),
  });

  const otherRequestsQuery = useQuery({
    queryKey: ["leave-other-requests"],
    queryFn: async () => fetchJson<OtherLeaveRequest[]>("/api/leave/other-requests"),
  });

  const balances = React.useMemo(() => balancesQuery.data?.data ?? [], [balancesQuery.data]);
  const leaveTypes = React.useMemo(() => leaveTypesQuery.data?.data ?? [], [leaveTypesQuery.data]);
  const users = React.useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const annualRequests = React.useMemo(() => annualRequestsQuery.data?.data ?? [], [annualRequestsQuery.data]);
  const otherRequests = React.useMemo(() => otherRequestsQuery.data?.data ?? [], [otherRequestsQuery.data]);

  const annualBalance = balances[0];
  const unifiedRequests = React.useMemo(
    () => mapRequests(annualRequests, otherRequests),
    [annualRequests, otherRequests],
  );

  const filteredRequests = React.useMemo(() => {
    return unifiedRequests.filter((item) => {
      if (activeKind !== "ALL" && item.kind !== activeKind) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      return true;
    });
  }, [activeKind, statusFilter, unifiedRequests]);

  const reviewStats = React.useMemo(() => buildStatusSummary(unifiedRequests), [unifiedRequests]);
  const canReview = role === "SUPER_ADMIN" || role === "MANAGER";

  const invalidateLeave = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] }),
      queryClient.invalidateQueries({ queryKey: ["leave-annual-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["leave-other-requests"] }),
    ]);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof defaultForm) => {
      if (payload.kind === "ANNUAL") {
        return fetchJson("/api/leave/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveTypeId: payload.leaveTypeId,
            startDate: payload.startDate,
            endDate: payload.endDate,
            reason: payload.reason,
          }),
        });
      }

      return fetchJson("/api/leave/other-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          startDate: payload.startDate,
          endDate: payload.endDate,
          reason: payload.reason,
        }),
      });
    },
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCreateForm(defaultForm);
      await invalidateLeave();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      request,
      status,
      note,
    }: {
      request: UnifiedRequest;
      status: "APPROVED" | "REJECTED";
      note: string;
    }) =>
      fetchJson(
        request.kind === "ANNUAL"
          ? `/api/leave/requests/${request.id}/review`
          : `/api/leave/other-requests/${request.id}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note }),
        },
      ),
    onSuccess: async () => {
      setReviewNote("");
      setDetailRequest(null);
      await invalidateLeave();
    },
  });

  const extraLeaveMutation = useMutation({
    mutationFn: async (payload: typeof extraLeaveForm) =>
      fetchJson(`/api/users/${payload.userId}/extra-leaves`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: payload.leaveTypeId,
          year: Number(payload.year),
          days: Number(payload.days),
          reason: payload.reason,
        }),
      }),
    onSuccess: async () => {
      setIsExtraLeaveOpen(false);
      setExtraLeaveForm((current) => ({
        ...current,
        days: "",
        reason: "",
      }));
      await invalidateLeave();
    },
  });

  const loading = balancesQuery.isLoading || annualRequestsQuery.isLoading || otherRequestsQuery.isLoading;
  const annualType = leaveTypes.find((item) => item.name.toLowerCase().includes("annual")) || leaveTypes[0];

  React.useEffect(() => {
    if (!extraLeaveForm.leaveTypeId && annualType?.id) {
      setExtraLeaveForm((current) => ({ ...current, leaveTypeId: annualType.id }));
    }
    if (!extraLeaveForm.userId && users[0]?.id) {
      setExtraLeaveForm((current) => ({ ...current, userId: users[0]!.id }));
    }
  }, [annualType?.id, extraLeaveForm.leaveTypeId, extraLeaveForm.userId, users]);

  const balanceCards = annualBalance
    ? [
        {
          label: "Annual leave total",
          value: annualBalance.summary.total,
          hint: `${annualBalance.year} entitlement`,
          icon: <CalendarRange className="h-5 w-5" />,
        },
        {
          label: "Used",
          value: annualBalance.summary.used,
          hint: "Approved annual leave only",
          icon: <CheckCircle2 className="h-5 w-5" />,
        },
        {
          label: "Remaining",
          value: annualBalance.summary.remaining,
          hint: "Available for new requests",
          icon: <ShieldCheck className="h-5 w-5" />,
        },
        {
          label: "Extra leave",
          value: annualBalance.extraDays,
          hint: annualBalance.extraDays > 0 ? "Added by manager or admin" : "No extra days added",
          icon: <Sparkles className="h-5 w-5" />,
        },
      ]
    : [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="People Ops"
        title="Leave"
        description="Track annual and other leave, review pending requests, and keep balances understandable for the whole team."
        actions={
          <>
            {role !== "EMPLOYEE" ? (
              <Dialog open={isExtraLeaveOpen} onOpenChange={setIsExtraLeaveOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="h-11 rounded-xl border-slate-300 bg-white px-4">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Extra Leave
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">Add extra leave</h2>
                    <p className="text-sm text-slate-500">Increase annual leave for an employee without changing the core yearly default.</p>
                  </div>
                  <form
                    className="space-y-6"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await extraLeaveMutation.mutateAsync(extraLeaveForm);
                    }}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Employee</span>
                        <select
                          className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                          value={extraLeaveForm.userId}
                          onChange={(event) => setExtraLeaveForm((current) => ({ ...current, userId: event.target.value }))}
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Leave type</span>
                        <select
                          className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                          value={extraLeaveForm.leaveTypeId}
                          onChange={(event) => setExtraLeaveForm((current) => ({ ...current, leaveTypeId: event.target.value }))}
                        >
                          {leaveTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Year</span>
                        <Input value={extraLeaveForm.year} onChange={(event) => setExtraLeaveForm((current) => ({ ...current, year: event.target.value }))} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Days</span>
                        <Input value={extraLeaveForm.days} onChange={(event) => setExtraLeaveForm((current) => ({ ...current, days: event.target.value }))} />
                      </label>
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-medium text-slate-700">Reason</span>
                        <textarea
                          className="flex min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                          value={extraLeaveForm.reason}
                          onChange={(event) => setExtraLeaveForm((current) => ({ ...current, reason: event.target.value }))}
                          placeholder="Why are you adding extra leave?"
                        />
                      </label>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsExtraLeaveOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!extraLeaveForm.userId || !extraLeaveForm.leaveTypeId || !extraLeaveForm.days || extraLeaveForm.reason.length < 3 || extraLeaveMutation.isPending}
                      >
                        Add leave days
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-4">
                  <Plus className="mr-2 h-4 w-4" />
                  New Leave Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Create leave request</h2>
                  <p className="text-sm text-slate-500">
                    Choose between annual leave and other leave, then submit the same request workflow the backend already enforces.
                  </p>
                </div>
                <CreateLeaveForm
                  annualTypeId={annualType?.id || ""}
                  form={createForm}
                  onChange={setCreateForm}
                  isSubmitting={createMutation.isPending}
                  onCancel={() => setIsCreateOpen(false)}
                  onSubmit={() => createMutation.mutateAsync(createForm)}
                />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : annualBalance ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {balanceCards.map((card) => (
            <StatsCard key={card.label} label={card.label} value={card.value} hint={card.hint} icon={card.icon} />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          title="No leave balance found"
          description="Leave balances have not been initialized for your account yet."
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.9fr)]">
        <Card>
          <CardHeader className="border-b bg-slate-50/70 pb-4">
            <CardTitle className="text-base font-semibold text-slate-950">Leave type selector</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <LeaveTypeCard
                title="Annual Leave"
                description="Uses your yearly annual leave balance and only deducts days when the request is approved."
                selected={createForm.kind === "ANNUAL"}
                icon={<CalendarClock className="h-5 w-5" />}
                onSelect={() =>
                  setCreateForm((current) => ({
                    ...current,
                    kind: "ANNUAL",
                    leaveTypeId: annualType?.id || current.leaveTypeId,
                  }))
                }
              />
              <LeaveTypeCard
                title="Other Leave"
                description="For leave outside annual entitlement. It follows review workflow but does not deduct annual balance."
                selected={createForm.kind === "OTHER"}
                icon={<BriefcaseMedical className="h-5 w-5" />}
                onSelect={() =>
                  setCreateForm((current) => ({
                    ...current,
                    kind: "OTHER",
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-slate-50/70 pb-4">
            <CardTitle className="text-base font-semibold text-slate-950">Review visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            <InfoRow label="Pending requests" value={String(reviewStats.pending)} />
            <InfoRow label="Approved days" value={String(reviewStats.approved)} />
            <InfoRow label="Rejected requests" value={String(reviewStats.rejected)} />
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Workflow note</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Annual leave reduces balance only on approval. Other leave follows the same review path without affecting annual entitlement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Request view</p>
            <p className="text-sm text-slate-500">
              Switch between annual and other leave, narrow by status, and review request details without losing context.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-3 text-slate-600"
            onClick={() => {
              setActiveKind("ALL");
              setStatusFilter("ALL");
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset view
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <SegmentButton
            title="All requests"
            description="Annual and other leave together"
            active={activeKind === "ALL"}
            onClick={() => setActiveKind("ALL")}
          />
          <SegmentButton
            title="Annual leave"
            description="Balance-linked requests"
            active={activeKind === "ANNUAL"}
            onClick={() => setActiveKind("ANNUAL")}
          />
          <SegmentButton
            title="Other leave"
            description="Non-deducting requests"
            active={activeKind === "OTHER"}
            onClick={() => setActiveKind("OTHER")}
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={statusFilter === status ? "default" : "outline"}
                  className="h-9 rounded-lg"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "ALL" ? "All" : status.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </FilterToolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.95fr)]">
        <DataTableShell
          title="Leave requests"
          description="A clearer request register for annual and other leave, with review actions kept close to the request."
        >
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No leave requests in this view"
                description="Try switching request type or status, or create a fresh leave request."
                action={
                  <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New leave request
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80">
              <div className="max-h-[720px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Employee</TH>
                      <TH>Leave type</TH>
                      <TH>Dates</TH>
                      <TH>Days</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredRequests.map((request) => (
                      <TR key={`${request.kind}-${request.id}`}>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{request.employeeName}</p>
                            <p className="text-xs text-slate-500">{request.employeeEmail}</p>
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{request.title}</p>
                            <p className="text-xs text-slate-500">{request.subtitle}</p>
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{formatDate(request.startDate)}</p>
                            <p className="text-xs text-slate-500">to {formatDate(request.endDate)}</p>
                          </div>
                        </TD>
                        <TD className="font-semibold text-slate-950">{request.totalDays}</TD>
                        <TD>
                          <StatusBadge status={request.status} />
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => {
                                setDetailRequest(request);
                                setReviewNote(request.reviewNote || "");
                              }}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                            {canReview && request.status === "PENDING" ? (
                              <Button
                                size="sm"
                                className="rounded-lg"
                                onClick={() => {
                                  setDetailRequest(request);
                                  setReviewNote(request.reviewNote || "");
                                }}
                              >
                                Review
                              </Button>
                            ) : null}
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </DataTableShell>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">Request detail</CardTitle>
            </CardHeader>
            <CardContent>
              {detailRequest ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{detailRequest.title}</p>
                        <p className="text-sm text-slate-500">{detailRequest.employeeName}</p>
                      </div>
                      <StatusBadge status={detailRequest.status} />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{detailRequest.reason}</p>
                  </div>

                  <div className="grid gap-3">
                    <InfoRow label="Dates" value={`${formatDate(detailRequest.startDate)} to ${formatDate(detailRequest.endDate)}`} />
                    <InfoRow label="Working days" value={String(detailRequest.totalDays)} />
                    <InfoRow label="Request type" value={detailRequest.kind === "ANNUAL" ? "Annual Leave" : "Other Leave"} />
                  </div>

                  {detailRequest.reviewNote ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                          <MessageSquareQuote className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">Review note</p>
                          <p className="text-sm leading-6 text-slate-600">{detailRequest.reviewNote}</p>
                          <p className="text-xs text-slate-500">
                            {detailRequest.reviewedBy ? `By ${detailRequest.reviewedBy}` : "Reviewed"} on {formatDate(detailRequest.reviewedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {canReview && detailRequest.status === "PENDING" ? (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">Review actions</p>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Add the required review note"
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          disabled={reviewMutation.isPending || reviewNote.trim().length < 3}
                          onClick={() =>
                            reviewMutation.mutate({
                              request: detailRequest,
                              status: "APPROVED",
                              note: reviewNote,
                            })
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reviewMutation.isPending || reviewNote.trim().length < 3}
                          onClick={() =>
                            reviewMutation.mutate({
                              request: detailRequest,
                              status: "REJECTED",
                              note: reviewNote,
                            })
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Select a leave request"
                  description="Open any row to see request details, notes, and review actions in one place."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">Workflow guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GuidanceItem
                icon={<Clock3 className="h-4 w-4" />}
                title="Annual leave deducts on approval"
                description="Pending annual leave does not reduce the available balance until a manager or admin approves it."
              />
              <GuidanceItem
                icon={<BriefcaseMedical className="h-4 w-4" />}
                title="Other leave stays separate"
                description="Other leave requests follow review workflow but never deduct from annual leave balance."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LeaveTypeCard({
  title,
  description,
  selected,
  icon,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "rounded-3xl border px-5 py-5 text-left transition",
        selected
          ? "border-indigo-300 bg-indigo-50 text-indigo-950 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-base font-semibold">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-indigo-700 ring-1 ring-inset ring-slate-200">
          {icon}
        </div>
      </div>
    </button>
  );
}

function SegmentButton({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-950 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-right text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function GuidanceItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">{icon}</div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function CreateLeaveForm({
  annualTypeId,
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  annualTypeId: string;
  form: typeof defaultForm;
  onChange: React.Dispatch<React.SetStateAction<typeof defaultForm>>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<unknown>;
}) {
  React.useEffect(() => {
    if (form.kind === "ANNUAL" && !form.leaveTypeId && annualTypeId) {
      onChange((current) => ({ ...current, leaveTypeId: annualTypeId }));
    }
  }, [annualTypeId, form.kind, form.leaveTypeId, onChange]);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Start date</span>
          <Input
            type="date"
            value={form.startDate}
            onChange={(event) => onChange((current) => ({ ...current, startDate: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">End date</span>
          <Input
            type="date"
            value={form.endDate}
            onChange={(event) => onChange((current) => ({ ...current, endDate: event.target.value }))}
            required
          />
        </label>
        {form.kind === "OTHER" ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <Input
              value={form.title}
              onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="Family emergency, medical leave, personal time"
              required
            />
          </label>
        ) : null}
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            className="flex min-h-[130px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            value={form.reason}
            onChange={(event) => onChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Share the context for the request"
            required
          />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
