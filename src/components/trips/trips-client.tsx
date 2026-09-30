"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  DollarSign,
  Eye,
  FileSpreadsheet,
  MapPinned,
  Plus,
  ReceiptText,
  RefreshCcw,
  Route,
  Sparkles,
  XCircle,
} from "lucide-react";

import { DataTableShell } from "@/components/layout/data-table-shell";
import { FilterToolbar } from "@/components/layout/filter-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/layout/stats-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TBody, TD, TH, THead, Table, TR } from "@/components/ui/table";

type Role = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";
type TripStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type TripItem = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  totalDays: number;
  estimatedBudget: string | number;
  actualTotal?: string | number;
  status: TripStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
  itinerary: Array<{
    id: string;
    dayNumber: number;
    date: string;
    activities: string;
    notes?: string | null;
  }>;
};

type TripExpense = {
  id: string;
  title: string;
  amount: string | number;
  expenseDate?: string | null;
  isSettled: boolean;
  isArchived: boolean;
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const compactCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const defaultTripForm = {
  title: "",
  destination: "",
  purpose: "",
  departureDate: "",
  returnDate: "",
  estimatedBudget: "",
  itinerary: [
    {
      dayNumber: 1,
      date: "",
      activities: "",
      notes: "",
    },
  ],
};

async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function parseAmount(value: string | number | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value: string | number | undefined) {
  return currency.format(parseAmount(value));
}

function formatCompactCurrency(value: string | number | undefined) {
  return compactCurrency.format(parseAmount(value));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function buildTripSummary(trips: TripItem[]) {
  return trips.reduce(
    (acc, trip) => {
      acc.totalTrips += 1;
      if (trip.status === "PENDING") acc.pendingTrips += 1;
      if (trip.status === "APPROVED") acc.approvedTrips += 1;
      if (trip.status === "COMPLETED") acc.completedTrips += 1;
      acc.estimatedTotal += parseAmount(trip.estimatedBudget);
      acc.actualTotal += parseAmount(trip.actualTotal);
      return acc;
    },
    {
      totalTrips: 0,
      pendingTrips: 0,
      approvedTrips: 0,
      completedTrips: 0,
      estimatedTotal: 0,
      actualTotal: 0,
    },
  );
}

export function TripsClient({ role, userId }: { role: Role; userId: string }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | TripStatus>("ALL");
  const [detailTrip, setDetailTrip] = React.useState<TripItem | null>(null);
  const [detailTab, setDetailTab] = React.useState<"overview" | "itinerary" | "expenses">("overview");
  const [reviewNote, setReviewNote] = React.useState("");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [tripForm, setTripForm] = React.useState(defaultTripForm);

  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: async () => fetchJson<TripItem[]>("/api/trips"),
  });

  const tripExpensesQuery = useQuery({
    queryKey: ["trip-expenses", detailTrip?.id],
    queryFn: async () => fetchJson<TripExpense[]>(`/api/trips/${detailTrip?.id}/expenses`),
    enabled: Boolean(detailTrip) && detailTab === "expenses",
  });

  const trips = React.useMemo(() => tripsQuery.data?.data ?? [], [tripsQuery.data]);
  const summary = React.useMemo(() => buildTripSummary(trips), [trips]);
  const filteredTrips = React.useMemo(
    () => trips.filter((trip) => (statusFilter === "ALL" ? true : trip.status === statusFilter)),
    [trips, statusFilter],
  );

  const invalidateTrips = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trips"] }),
      queryClient.invalidateQueries({ queryKey: ["trip-expenses"] }),
    ]);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof defaultTripForm) =>
      fetchJson("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          estimatedBudget: Number(payload.estimatedBudget),
          itinerary: payload.itinerary.map((row) => ({
            ...row,
            notes: row.notes || null,
          })),
        }),
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setTripForm(defaultTripForm);
      await invalidateTrips();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      note: string;
    }) =>
      fetchJson(`/api/trips/${id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: async () => {
      setReviewNote("");
      await invalidateTrips();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) =>
      fetchJson(`/api/trips/${id}/complete`, {
        method: "PUT",
      }),
    onSuccess: async () => {
      await invalidateTrips();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) =>
      fetchJson(`/api/trips/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidateTrips();
    },
  });

  React.useEffect(() => {
    if (!detailTrip) return;
    const next = trips.find((trip) => trip.id === detailTrip.id) || null;
    setDetailTrip(next);
  }, [detailTrip, trips]);

  const canReview = role === "SUPER_ADMIN" || role === "MANAGER";
  const canComplete = canReview;

  const summaryCards = [
    {
      label: "Total trips",
      value: summary.totalTrips,
      hint: "All trips in the current scope",
      icon: <Route className="h-5 w-5" />,
    },
    {
      label: "Pending trips",
      value: summary.pendingTrips,
      hint: "Awaiting decision",
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      label: "Approved trips",
      value: summary.approvedTrips,
      hint: "Ready to travel",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      label: "Completed trips",
      value: summary.completedTrips,
      hint: "Closed travel cycles",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      label: "Estimated budget",
      value: formatCompactCurrency(summary.estimatedTotal),
      hint: formatCurrency(summary.estimatedTotal),
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      label: "Actual spend",
      value: formatCompactCurrency(summary.actualTotal),
      hint: formatCurrency(summary.actualTotal),
      icon: <ReceiptText className="h-5 w-5" />,
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Travel Ops"
        title="Trips"
        description="Review travel requests, track estimated versus actual spend, and keep itinerary context close to every decision."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Trip
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Create trip</h2>
                  <p className="text-sm text-slate-500">
                    Add trip details and itinerary rows in one place. Approval and completion flow stay unchanged.
                  </p>
                </div>
                <TripForm
                  form={tripForm}
                  onChange={setTripForm}
                  isSubmitting={createMutation.isPending}
                  onCancel={() => setIsCreateOpen(false)}
                  onSubmit={() => createMutation.mutateAsync(tripForm)}
                />
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="outline"
             
              onClick={() => window.open("/api/export/trips/excel", "_blank")}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <StaggerItem key={card.label}>
            <StatsCard label={card.label} value={card.value} hint={card.hint} icon={card.icon} />
          </StaggerItem>
        ))}
      </Stagger>

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Trip status view</p>
            <p className="text-sm text-slate-500">
              Switch between pending, approved, completed, rejected, or cancelled trips without losing detail context.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-md px-3 text-slate-600"
            onClick={() => setStatusFilter("ALL")}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset view
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "APPROVED", "COMPLETED", "REJECTED", "CANCELLED"] as const).map((status) => (
            <Button
              key={status}
              type="button"
              variant={statusFilter === status ? "default" : "outline"}
              className="h-9 rounded-lg"
              onClick={() => setStatusFilter(status)}
            >
              {status === "ALL" ? "All trips" : status.toLowerCase()}
            </Button>
          ))}
        </div>
      </FilterToolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.95fr)]">
        <DataTableShell
          title="Trip register"
          description="A clearer travel register with status, budget, and action visibility for request owners and reviewers."
        >
          {tripsQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-6">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No trips in this view"
                description="Create a trip or switch the status filter to explore the travel workflow."
                action={
                  <Button type="button" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New trip
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <div className="max-h-[720px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Trip</TH>
                      <TH>Destination</TH>
                      <TH>Dates</TH>
                      <TH>Budget</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredTrips.map((trip) => (
                      <TR key={trip.id}>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{trip.title}</p>
                            <p className="text-xs text-slate-500">{trip.user?.name || trip.user?.email || "—"}</p>
                            <p className="line-clamp-1 text-xs text-slate-500">{trip.purpose}</p>
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{trip.destination}</p>
                            <p className="text-xs text-slate-500">{trip.totalDays} working days</p>
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{formatDate(trip.departureDate)}</p>
                            <p className="text-xs text-slate-500">to {formatDate(trip.returnDate)}</p>
                          </div>
                        </TD>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950">{formatCurrency(trip.estimatedBudget)}</p>
                            <p className="text-xs text-slate-500">Actual {formatCurrency(trip.actualTotal)}</p>
                          </div>
                        </TD>
                        <TD>
                          <StatusBadge status={trip.status} />
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => {
                                setDetailTrip(trip);
                                setDetailTab("overview");
                                setReviewNote(trip.reviewNote || "");
                              }}
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
                            {canReview && trip.status === "PENDING" ? (
                              <Button
                                size="sm"
                                className="rounded-lg"
                                onClick={() => {
                                  setDetailTrip(trip);
                                  setDetailTab("overview");
                                  setReviewNote(trip.reviewNote || "");
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
              <CardTitle className="text-base font-semibold text-slate-950">Trip detail</CardTitle>
            </CardHeader>
            <CardContent>
              {detailTrip ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {(["overview", "itinerary", "expenses"] as const).map((tab) => (
                      <Button
                        key={tab}
                        type="button"
                        variant={detailTab === tab ? "default" : "outline"}
                        className="h-9 rounded-lg"
                        onClick={() => setDetailTab(tab)}
                      >
                        {tab}
                      </Button>
                    ))}
                  </div>

                  {detailTab === "overview" ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{detailTrip.title}</p>
                            <p className="text-sm text-slate-500">{detailTrip.destination}</p>
                          </div>
                          <StatusBadge status={detailTrip.status} />
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{detailTrip.purpose}</p>
                      </div>

                      <div className="grid gap-3">
                        <InfoRow label="Traveller" value={detailTrip.user?.name || detailTrip.user?.email || "—"} />
                        <InfoRow label="Dates" value={`${formatDate(detailTrip.departureDate)} to ${formatDate(detailTrip.returnDate)}`} />
                        <InfoRow label="Working days" value={String(detailTrip.totalDays)} />
                        <InfoRow label="Estimated budget" value={formatCurrency(detailTrip.estimatedBudget)} />
                        <InfoRow label="Actual spend" value={formatCurrency(detailTrip.actualTotal)} />
                      </div>

                      {detailTrip.reviewNote ? (
                        <div className="border-t border-[var(--border)] py-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-md bg-indigo-100 p-2 text-indigo-700">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900">Review note</p>
                              <p className="text-sm leading-6 text-slate-600">{detailTrip.reviewNote}</p>
                              <p className="text-xs text-slate-500">Reviewed on {formatDate(detailTrip.reviewedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        {canReview && detailTrip.status === "PENDING" ? (
                          <>
                            <textarea
                              className="min-h-[110px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
                              value={reviewNote}
                              onChange={(event) => setReviewNote(event.target.value)}
                              placeholder="Add review note"
                            />
                            <Button
                              type="button"
                              disabled={reviewMutation.isPending || reviewNote.trim().length < 3}
                              onClick={() =>
                                reviewMutation.mutate({
                                  id: detailTrip.id,
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
                                  id: detailTrip.id,
                                  status: "REJECTED",
                                  note: reviewNote,
                                })
                              }
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        ) : null}

                        {canComplete && detailTrip.status === "APPROVED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => completeMutation.mutate(detailTrip.id)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark complete
                          </Button>
                        ) : null}

                        {detailTrip.userId === userId && ["PENDING", "APPROVED"].includes(detailTrip.status) ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => cancelMutation.mutate(detailTrip.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel trip
                          </Button>
                        ) : null}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDetailTab("expenses")}
                        >
                          <ReceiptText className="mr-2 h-4 w-4" />
                          View linked expenses
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {detailTab === "itinerary" ? (
                    <div className="space-y-3">
                      {detailTrip.itinerary.length === 0 ? (
                        <EmptyState
                          title="No itinerary rows"
                          description="This trip does not have detailed day plans yet."
                        />
                      ) : (
                        detailTrip.itinerary.map((row) => (
                          <details key={row.id} className="border-b border-[var(--border)] py-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">Day {row.dayNumber}</p>
                                <p className="text-xs text-slate-500">{formatDate(row.date)}</p>
                              </div>
                              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Expand</span>
                            </summary>
                            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Activities</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{row.activities}</p>
                              </div>
                              {row.notes ? (
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Notes</p>
                                  <p className="mt-2 text-sm leading-6 text-slate-600">{row.notes}</p>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ))
                      )}
                    </div>
                  ) : null}

                  {detailTab === "expenses" ? (
                    <div className="space-y-3">
                      <div className="border-t border-[var(--border)] py-4">
                        <p className="text-sm font-semibold text-slate-900">Estimated vs actual</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <InfoRow label="Estimated budget" value={formatCurrency(detailTrip.estimatedBudget)} />
                          <InfoRow label="Actual trip expense total" value={formatCurrency(detailTrip.actualTotal)} />
                        </div>
                      </div>
                      {tripExpensesQuery.isLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                              <div className="grid gap-3 md:grid-cols-3">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-1/4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (tripExpensesQuery.data?.data?.length ?? 0) === 0 ? (
                        <EmptyState
                          title="No linked trip expenses"
                          description="Trip expenses linked to this travel request will appear here."
                        />
                      ) : (
                        <div className="space-y-3">
                          {tripExpensesQuery.data?.data?.map((expense) => (
                            <div key={expense.id} className="border-b border-[var(--border)] py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-slate-950">{expense.title}</p>
                                  <p className="text-xs text-slate-500">{formatDate(expense.expenseDate)}</p>
                                </div>
                                <div className="space-y-2 text-right">
                                  <p className="text-sm font-semibold text-slate-950">{formatCurrency(expense.amount)}</p>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <StatusBadge status={expense.isSettled ? "settled" : "pending"} />
                                    {expense.isArchived ? <StatusBadge status="archived" /> : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Select a trip"
                  description="Open a row to review trip details, itinerary, and linked expenses in one place."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">Travel workflow notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <GuidanceRow
                icon={<CircleDashed className="h-4 w-4" />}
                title="Status stays explicit"
                description="Pending, approved, rejected, completed, and cancelled trips each keep their own visible state and action rules."
              />
              <GuidanceRow
                icon={<ReceiptText className="h-4 w-4" />}
                title="Trip expenses stay linked"
                description="Estimated budget and actual trip spend sit together so reviewers can compare plan versus reality quickly."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-right text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function GuidanceRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-indigo-100 p-2 text-indigo-700">{icon}</div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function TripForm({
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  form: typeof defaultTripForm;
  onChange: React.Dispatch<React.SetStateAction<typeof defaultTripForm>>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<unknown>;
}) {
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
          <span className="text-sm font-medium text-slate-700">Title</span>
          <Input value={form.title} onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Destination</span>
          <Input value={form.destination} onChange={(event) => onChange((current) => ({ ...current, destination: event.target.value }))} required />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Purpose</span>
          <textarea
            className="min-h-[120px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.purpose}
            onChange={(event) => onChange((current) => ({ ...current, purpose: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Departure</span>
          <Input type="date" value={form.departureDate} onChange={(event) => onChange((current) => ({ ...current, departureDate: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Return</span>
          <Input type="date" value={form.returnDate} onChange={(event) => onChange((current) => ({ ...current, returnDate: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Estimated budget</span>
          <Input type="number" min={0} step="0.01" value={form.estimatedBudget} onChange={(event) => onChange((current) => ({ ...current, estimatedBudget: event.target.value }))} required />
        </label>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Itinerary</p>
            <p className="text-sm text-slate-500">Add day-by-day travel context for reviewers and travellers.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            onClick={() =>
              onChange((current) => ({
                ...current,
                itinerary: [
                  ...current.itinerary,
                  {
                    dayNumber: current.itinerary.length + 1,
                    date: "",
                    activities: "",
                    notes: "",
                  },
                ],
              }))
            }
          >
            Add day
          </Button>
        </div>
        <div className="space-y-4">
          {form.itinerary.map((row, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Day number</span>
                  <Input
                    type="number"
                    min={1}
                    value={row.dayNumber}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, dayNumber: Number(event.target.value) } : item,
                        ),
                      }))
                    }
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <Input
                    type="date"
                    value={row.date}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, date: event.target.value } : item,
                        ),
                      }))
                    }
                    required
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Activities</span>
                  <textarea
                    className="min-h-[100px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
                    value={row.activities}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, activities: event.target.value } : item,
                        ),
                      }))
                    }
                    required
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea
                    className="min-h-[90px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
                    value={row.notes}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, notes: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save trip"}
        </Button>
      </div>
    </form>
  );
}
