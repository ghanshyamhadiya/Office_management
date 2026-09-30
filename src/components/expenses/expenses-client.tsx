"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wallet,
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
import { features } from "@/lib/features";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TBody,
  TD,
  TH,
  THead,
  Table,
  TR,
} from "@/components/ui/table";

type ExpenseType = "FOOD" | "OTHER" | "TRIP";

type ExpenseItem = {
  id: string;
  title: string;
  description?: string | null;
  amount: string | number;
  expenseType: ExpenseType;
  expenseDate?: string;
  createdAt?: string;
  isSettled: boolean;
  isArchived: boolean;
  employee?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type ExpenseSummary = {
  count: number;
  total: string | number;
  settled: string | number;
  unsettled: string | number;
  budgetTotal?: string | number;
  tripTotal?: string | number;
  archivedCount?: number;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  warning?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
};

type ExpenseFilters = {
  employeeId: string;
  expenseType: string;
  settled: string;
  isArchived: boolean;
  month: string;
  year: string;
  from: string;
  to: string;
  minAmount: string;
  maxAmount: string;
  search: string;
  page: number;
  limit: number;
};

type SettlePreview = {
  count: number;
  total: string | number;
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

const defaultFilters: ExpenseFilters = {
  employeeId: "",
  expenseType: "",
  settled: "",
  isArchived: false,
  month: "",
  year: "",
  from: "",
  to: "",
  minAmount: "",
  maxAmount: "",
  search: "",
  page: 1,
  limit: 10,
};

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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function buildExpenseQuery(filters: ExpenseFilters, debouncedSearch: string) {
  const params = new URLSearchParams();

  if (filters.employeeId) params.set("employee_ids", filters.employeeId);
  if (filters.expenseType) params.set("expense_type", filters.expenseType);
  if (filters.settled) params.set("is_settled", filters.settled);
  if (filters.isArchived) params.set("is_archived", "true");
  if (filters.month) params.set("month", filters.month);
  if (filters.year) params.set("year", filters.year);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.minAmount) params.set("min_amount", filters.minAmount);
  if (filters.maxAmount) params.set("max_amount", filters.maxAmount);
  if (debouncedSearch) params.set("search", debouncedSearch);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  return params.toString();
}

function copyFiltersForSummary(filters: ExpenseFilters, debouncedSearch: string) {
  return {
    ...filters,
    search: debouncedSearch,
  };
}

function TotalsRow({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
      </div>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function ExpensesClient({ role }: { role: "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE" }) {
  const isAdmin = role === "SUPER_ADMIN";
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState<ExpenseFilters>(defaultFilters);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = React.useState(() => searchParams.get("new") === "1");
  const [isSettleMonthOpen, setIsSettleMonthOpen] = React.useState(false);
  const [monthEmployees, setMonthEmployees] = React.useState<string[]>([]);
  const [editingExpense, setEditingExpense] = React.useState<ExpenseItem | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);

  const expenseQueryString = React.useMemo(
    () => buildExpenseQuery(filters, debouncedSearch),
    [filters, debouncedSearch],
  );

  const summaryFilters = React.useMemo(
    () => copyFiltersForSummary(filters, debouncedSearch),
    [filters, debouncedSearch],
  );

  const expensesQuery = useQuery({
    queryKey: ["expenses", expenseQueryString],
    queryFn: async () => fetchJson<ExpenseItem[]>(`/api/expenses?${expenseQueryString}`),
    placeholderData: (previousData) => previousData,
  });

  const summaryQuery = useQuery({
    queryKey: ["expenses-summary", summaryFilters],
    queryFn: async () =>
      fetchJson<ExpenseSummary>(`/api/expenses/summary?${buildExpenseQuery(filters, debouncedSearch)}`),
    placeholderData: (previousData) => previousData,
  });

  const usersQuery = useQuery({
    queryKey: ["expense-users"],
    queryFn: async () => fetchJson<UserOption[]>("/api/users?limit=100"),
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const previewQuery = useQuery({
    queryKey: ["settle-preview", filters.month, filters.year, monthEmployees],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);
      if (monthEmployees.length > 0) params.set("employee_ids", monthEmployees.join(","));
      return fetchJson<SettlePreview>(`/api/expenses/settle-preview?${params.toString()}`);
    },
    enabled: isSettleMonthOpen && Boolean(filters.month && filters.year),
  });

  const expenses = React.useMemo(() => expensesQuery.data?.data ?? [], [expensesQuery.data]);
  const summary = summaryQuery.data?.data;
  const users = React.useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const selectedExpenses = React.useMemo(
    () => expenses.filter((expense) => selectedIds.includes(expense.id)),
    [expenses, selectedIds],
  );
  const selectedTotal = React.useMemo(
    () => selectedExpenses.reduce((sum, expense) => sum + parseAmount(expense.amount), 0),
    [selectedExpenses],
  );

  React.useEffect(() => {
    setSelectedIds((current) => current.filter((id) => expenses.some((expense) => expense.id === id)));
  }, [expenses]);

  const invalidateExpenses = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["expenses-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["settle-preview"] }),
    ]);
  }, [queryClient]);

  const settleMutation = useMutation({
    mutationFn: async ({ id, isSettled }: { id: string; isSettled: boolean }) =>
      fetchJson(`/api/expenses/${id}/settle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSettled }),
      }),
    onMutate: async ({ id, isSettled }) => {
      await queryClient.cancelQueries({ queryKey: ["expenses"] });
      const snapshots = queryClient.getQueriesData<ApiResponse<ExpenseItem[]>>({
        queryKey: ["expenses"],
      });

      snapshots.forEach(([queryKey, value]) => {
        if (!value?.data) return;
        queryClient.setQueryData<ApiResponse<ExpenseItem[]>>(queryKey, {
          ...value,
          data: value.data.map((expense) =>
            expense.id === id ? { ...expense, isSettled } : expense,
          ),
        });
      });

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots?.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSettled: async () => {
      await invalidateExpenses();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore?: boolean }) =>
      fetchJson(`/api/expenses/${id}/${restore ? "restore" : "archive"}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      await invalidateExpenses();
    },
  });

  const settleMonthMutation = useMutation({
    mutationFn: async ({
      month,
      year,
      employeeIds,
    }: {
      month: number;
      year: number;
      employeeIds: string[];
    }) =>
      fetchJson("/api/expenses/settle-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, employeeIds }),
      }),
    onSuccess: async () => {
      setIsSettleMonthOpen(false);
      await invalidateExpenses();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      amount: number;
      expenseType: ExpenseType;
      expenseDate: string;
      date: string;
    }) =>
      fetchJson("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      await invalidateExpenses();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        title: string;
        description: string;
        amount: number;
        expenseType: ExpenseType;
        expenseDate: string;
        date: string;
      };
    }) =>
      fetchJson(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setEditingExpense(null);
      await invalidateExpenses();
    },
  });

  const updateFilters = React.useCallback((patch: Partial<ExpenseFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }, []);

  const allCurrentPageSelected = expenses.length > 0 && selectedIds.length === expenses.length;
  const selectedCount = selectedIds.length;

  const summaryCards = [
    {
      title: "Total amount",
      value: formatCompactCurrency(summary?.total),
      detail: formatCurrency(summary?.total),
      icon: Wallet,
    },
    {
      title: "Unsettled amount",
      value: formatCompactCurrency(summary?.unsettled),
      detail: "Pending reimbursement",
      icon: ShieldAlert,
    },
    {
      title: "Settled amount",
      value: formatCompactCurrency(summary?.settled),
      detail: "Processed reimbursements",
      icon: CheckCircle2,
    },
    {
      title: "Budget-counted",
      value: formatCompactCurrency(summary?.budgetTotal),
      detail: "Food and other expenses",
      icon: CircleDollarSign,
    },
    ...(features.trips
      ? [{
          title: "Trip amount",
          value: formatCompactCurrency(summary?.tripTotal),
          detail: "Excluded from company budget",
          icon: ReceiptText,
        }]
      : []),
    {
      title: "Archived count",
      value: String(summary?.archivedCount ?? 0),
      detail: `${summary?.count ?? 0} records in scope`,
      icon: PackageOpen,
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operations"
        title="Expenses"
        description="Monitor submissions, resolve settlements, and keep budgeted spend visible without leaving the workflow."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button >
                  <Plus className="mr-2 h-4 w-4" />
                  New Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Add Expense</h2>
                  <p className="text-sm text-slate-500">Capture a new submission without leaving the register.</p>
                </div>
                <ExpenseEditor
                  isSubmitting={createMutation.isPending}
                  onCancel={() => setIsCreateOpen(false)}
                  onSubmit={(payload) => createMutation.mutateAsync(payload)}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editingExpense)} onOpenChange={(open) => !open && setEditingExpense(null)}>
              <DialogContent className="sm:max-w-2xl">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Edit Expense</h2>
                  <p className="text-sm text-slate-500">Update the record details while preserving the existing workflow.</p>
                </div>
                {editingExpense ? (
                  <ExpenseEditor
                    initialExpense={editingExpense}
                    isSubmitting={updateMutation.isPending}
                    onCancel={() => setEditingExpense(null)}
                    onSubmit={(payload) =>
                      updateMutation.mutateAsync({
                        id: editingExpense.id,
                        payload,
                      })
                    }
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="outline"
              
              onClick={() => window.open(`/api/export/expenses/excel?${expenseQueryString}`, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>

            {isAdmin ? (<>
            <Button
              type="button"
              variant="outline"
              
              disabled={selectedCount === 0 || settleMutation.isPending}
              onClick={async () => {
                await Promise.all(
                  selectedExpenses.map((expense) =>
                    settleMutation.mutateAsync({ id: expense.id, isSettled: true }),
                  ),
                );
                setSelectedIds([]);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Settle Selected
            </Button>

            <Dialog open={isSettleMonthOpen} onOpenChange={setIsSettleMonthOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Settle Month
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl">
                <div className="mb-5 space-y-1">
                  <h2 className="text-lg font-semibold text-slate-950">Settle Month</h2>
                  <p className="text-sm text-slate-500">Preview unsettled expenses and close a specific accounting window.</p>
                </div>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Month</span>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={filters.month}
                        onChange={(event) => updateFilters({ month: event.target.value })}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Year</span>
                      <Input
                        type="number"
                        min={2000}
                        max={2100}
                        value={filters.year}
                        onChange={(event) => updateFilters({ year: event.target.value })}
                      />
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Preview</p>
                      {previewQuery.isLoading ? (
                        <div className="mt-3 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-6 w-32" />
                        </div>
                      ) : (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm text-slate-600">
                            {previewQuery.data?.data?.count ?? 0} unsettled expenses
                          </p>
                          <p className="text-xl font-semibold text-slate-950">
                            {formatCurrency(previewQuery.data?.data?.total)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Employees</p>
                        <p className="text-sm text-slate-500">Leave blank to settle all visible employees.</p>
                      </div>
                      {monthEmployees.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 rounded-lg px-3 text-slate-600"
                          onClick={() => setMonthEmployees([])}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2">
                      {users.map((user) => {
                        const checked = monthEmployees.includes(user.id);
                        return (
                          <label
                            key={user.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 px-3 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              checked={checked}
                              onChange={(event) => {
                                setMonthEmployees((current) =>
                                  event.target.checked
                                    ? [...current, user.id]
                                    : current.filter((value) => value !== user.id),
                                );
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{user.name || user.email}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsSettleMonthOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={!filters.month || !filters.year || settleMonthMutation.isPending}
                      onClick={() =>
                        settleMonthMutation.mutate({
                          month: Number(filters.month),
                          year: Number(filters.year),
                          employeeIds: monthEmployees,
                        })
                      }
                    >
                      Confirm Settlement
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </>) : null}
          </div>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StaggerItem key={card.title}>
            <StatsCard
            label={card.title}
            value={card.value}
            hint={card.detail}
            icon={<card.icon className="h-5 w-5" />}
          />
          </StaggerItem>
        ))}
      </Stagger>

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <p className="text-sm text-slate-500">
              {isAdmin ? "Filter by employee, type, settlement status, archive state, or dates." : "Filter your expenses by type, settlement status, or dates."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            
            onClick={() => {
              setFilters(defaultFilters);
              setMonthEmployees([]);
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin ? <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Employee</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={filters.employeeId}
              onChange={(event) => updateFilters({ employeeId: event.target.value })}
            >
              <option value="">All employees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </label> : null}

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Expense type</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={filters.expenseType}
              onChange={(event) => updateFilters({ expenseType: event.target.value })}
            >
              <option value="">All types</option>
              <option value="FOOD">Food</option>
              <option value="OTHER">Other</option>
              {features.trips ? <option value="TRIP">Trip</option> : null}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Settlement</span>
            <select
              className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
              value={filters.settled}
              onChange={(event) => updateFilters({ settled: event.target.value })}
            >
              <option value="">All</option>
              <option value="true">Settled</option>
              <option value="false">Unsettled</option>
            </select>
          </label>

          <details className="col-span-full order-last mt-2">
            <summary className="cursor-pointer py-2 text-xs font-medium text-[var(--muted-foreground)]">Dates & amount range</summary>
            <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Month</span>
            <Input value={filters.month} onChange={(event) => updateFilters({ month: event.target.value })} placeholder="3" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Year</span>
            <Input value={filters.year} onChange={(event) => updateFilters({ year: event.target.value })} placeholder="2026" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">From</span>
            <Input type="date" value={filters.from} onChange={(event) => updateFilters({ from: event.target.value })} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">To</span>
            <Input type="date" value={filters.to} onChange={(event) => updateFilters({ to: event.target.value })} />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Min amount</span>
            <Input
              type="number"
              value={filters.minAmount}
              onChange={(event) => updateFilters({ minAmount: event.target.value })}
              placeholder="0"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Max amount</span>
            <Input
              type="number"
              value={filters.maxAmount}
              onChange={(event) => updateFilters({ maxAmount: event.target.value })}
              placeholder="50000"
            />
          </label>

            </div>
          </details>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
                className="pl-9"
                placeholder="Search title or description"
              />
            </div>
          </label>
        </div>

        {isAdmin ? <div className="mt-4 flex items-center gap-3">
          <label className="inline-flex items-center gap-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={filters.isArchived}
              onChange={(event) => updateFilters({ isArchived: event.target.checked })}
            />
            Show archived
          </label>
        </div> : null}
      </FilterToolbar>

      {isAdmin && selectedCount > 0 ? (
        <Card className="border-indigo-200/80 bg-indigo-50/70">
          <CardContent className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-indigo-900">{selectedCount} expenses selected</p>
              <p className="text-sm text-indigo-800/80">Selection total {formatCurrency(selectedTotal)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                
                disabled={settleMutation.isPending}
                onClick={async () => {
                  await Promise.all(
                    selectedExpenses.map((expense) =>
                      settleMutation.mutateAsync({ id: expense.id, isSettled: true }),
                    ),
                  );
                  setSelectedIds([]);
                }}
              >
                Settle selected
              </Button>
              <Button
                type="button"
                variant="outline"
                
                disabled={settleMutation.isPending}
                onClick={async () => {
                  await Promise.all(
                    selectedExpenses.map((expense) =>
                      settleMutation.mutateAsync({ id: expense.id, isSettled: false }),
                    ),
                  );
                  setSelectedIds([]);
                }}
              >
                Unsettle selected
              </Button>
              <Button
                type="button"
                variant="ghost"
                
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-10">
        <DataTableShell
          title="Expense register"
          description="Use the table for quick review, settlement changes, and archive handling."
        >
          {expensesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : expensesQuery.isError ? (
            <EmptyState
              title="Unable to load expenses"
              description={expensesQuery.error instanceof Error ? expensesQuery.error.message : "Please try again."}
              action={
                <Button type="button" variant="outline" onClick={() => expensesQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : expenses.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="Try adjusting filters or create a new expense to start the register."
              action={
                <Button type="button" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add expense
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-hidden border-y border-[var(--border)]">
                <div className="max-h-[680px] overflow-auto">
                  <Table>
                    <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                      <TR>
                        {isAdmin ? <TH className="w-12">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={allCurrentPageSelected}
                            onChange={(event) =>
                              setSelectedIds(event.target.checked ? expenses.map((expense) => expense.id) : [])
                            }
                          />
                        </TH> : null}
                        <TH>Title</TH>
                        {isAdmin ? <TH>Employee</TH> : null}
                        <TH>Type</TH>
                        <TH className="text-right">Amount</TH>
                        <TH>Date</TH>
                        <TH>Settled</TH>
                        <TH>Archived</TH>
                        <TH className="text-right">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {expenses.map((expense) => {
                        const checked = selectedIds.includes(expense.id);
                        return (
                          <TR key={expense.id} className="transition hover:bg-slate-50/80">
                            {isAdmin ? <TD>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={checked}
                                onChange={(event) =>
                                  setSelectedIds((current) =>
                                    event.target.checked
                                      ? [...current, expense.id]
                                      : current.filter((id) => id !== expense.id),
                                  )
                                }
                              />
                            </TD> : null}
                            <TD>
                              <div className="space-y-1">
                                <p className="font-medium text-slate-950">{expense.title}</p>
                                <p className="line-clamp-1 text-xs text-slate-500">
                                  {expense.description || "No description added"}
                                </p>
                              </div>
                            </TD>
                            {isAdmin ? <TD>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {(expense.employee ?? expense.user)?.name || (expense.employee ?? expense.user)?.email || "—"}
                                </p>
                                {(expense.employee ?? expense.user)?.email ? (
                                  <p className="text-xs text-slate-500">{(expense.employee ?? expense.user)?.email}</p>
                                ) : null}
                              </div>
                            </TD> : null}
                            <TD>
                              <StatusBadge status={expense.expenseType} className="capitalize" />
                            </TD>
                            <TD className="text-right font-semibold text-slate-950">
                              {formatCurrency(expense.amount)}
                            </TD>
                            <TD className="text-slate-600">
                              {formatDate(expense.expenseDate || expense.createdAt)}
                            </TD>
                            <TD>
                              <StatusBadge status={expense.isSettled ? "settled" : "pending"} />
                            </TD>
                            <TD>
                              <StatusBadge status={expense.isArchived ? "archived" : "active"} />
                            </TD>
                            <TD>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild className="rounded-lg">
                                  <Link href={`/expenses/${expense.id}`}>
                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    View
                                  </Link>
                                </Button>
                                {!expense.isSettled && !expense.isArchived ? <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => setEditingExpense(expense)}
                                >
                                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button> : null}
                                {isAdmin ? <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() =>
                                    settleMutation.mutate({
                                      id: expense.id,
                                      isSettled: !expense.isSettled,
                                    })
                                  }
                                >
                                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                  {expense.isSettled ? "Unsettle" : "Settle"}
                                </Button> : null}
                                {isAdmin || (!expense.isSettled && !expense.isArchived) ? <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() =>
                                    archiveMutation.mutate({
                                      id: expense.id,
                                      restore: expense.isArchived,
                                    })
                                  }
                                >
                                  {expense.isArchived ? (
                                    <>
                                      <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                                      Restore
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                      Archive
                                    </>
                                  )}
                                </Button> : null}
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
                  Page {expensesQuery.data?.meta?.page ?? filters.page} of {expensesQuery.data?.meta?.pages ?? 1}
                  {" · "}
                  {(expensesQuery.data?.meta?.total ?? expenses.length).toLocaleString("en-IN")} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-md"
                    disabled={(expensesQuery.data?.meta?.page ?? 1) <= 1}
                    onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-md"
                    disabled={(expensesQuery.data?.meta?.page ?? 1) >= (expensesQuery.data?.meta?.pages ?? 1)}
                    onClick={() => updateFilters({ page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </DataTableShell>

        <div className="grid gap-10 border-t pt-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">Settlement focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TotalsRow
                title="Current unsettled"
                value={formatCurrency(summary?.unsettled)}
                detail="What still needs reimbursement attention"
              />
              <TotalsRow
                title="Budget-counted spend"
                value={formatCurrency(summary?.budgetTotal)}
                detail="Only food and other contribute to budget usage"
              />
              {features.trips ? (
                <TotalsRow
                  title="Trip expenses"
                  value={formatCurrency(summary?.tripTotal)}
                  detail="Tracked separately from company budget"
                />
              ) : null}
            </CardContent>
          </Card>

          {isAdmin ? <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-slate-950">Operational notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-t border-[var(--border)] py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-indigo-100 p-2 text-indigo-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Fast settlement workflow</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Select rows to bulk settle the visible set, or use Settle Month for a controlled payroll-cycle close.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--border)] py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-[var(--primary)] p-2 text-[var(--primary-foreground)]">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Close the month with confidence</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Preview eligible expenses before confirming a monthly settlement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card> : null}
        </div>
      </div>
    </div>
  );
}

function ExpenseEditor({
  initialExpense,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  initialExpense?: ExpenseItem | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    amount: number;
    expenseType: ExpenseType;
    expenseDate: string;
    date: string;
  }) => Promise<unknown>;
}) {
  const [title, setTitle] = React.useState(initialExpense?.title ?? "");
  const [description, setDescription] = React.useState(initialExpense?.description ?? "");
  const [amount, setAmount] = React.useState(
    initialExpense ? String(parseAmount(initialExpense.amount)) : "",
  );
  const [expenseType, setExpenseType] = React.useState<ExpenseType>(initialExpense?.expenseType ?? "FOOD");
  const [expenseDate, setExpenseDate] = React.useState(
    initialExpense?.expenseDate ? initialExpense.expenseDate.slice(0, 10) : "",
  );

  React.useEffect(() => {
    setTitle(initialExpense?.title ?? "");
    setDescription(initialExpense?.description ?? "");
    setAmount(initialExpense ? String(parseAmount(initialExpense.amount)) : "");
    setExpenseType(initialExpense?.expenseType ?? "FOOD");
    setExpenseDate(initialExpense?.expenseDate ? initialExpense.expenseDate.slice(0, 10) : "");
  }, [initialExpense]);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          title,
          description,
          amount: Number(amount),
          expenseType,
          expenseDate,
          date: expenseDate,
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="flex min-h-[120px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Amount</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Date</span>
          <Input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Expense type</p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(["FOOD", "OTHER", ...(features.trips || initialExpense?.expenseType === "TRIP" ? ["TRIP"] : [])] as ExpenseType[]).map((type) => {
            const active = expenseType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setExpenseType(type)}
                className={[
                  "rounded-lg border px-4 py-4 text-left transition",
                  active
                    ? "border-indigo-300 bg-indigo-50 text-indigo-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold">{type}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {type === "TRIP"
                    ? "Separate from company budget."
                    : "Included in regular budget tracking."}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save expense"}
        </Button>
      </div>
    </form>
  );
}
