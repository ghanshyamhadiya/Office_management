"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Coins,
  DollarSign,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  RefreshCcw,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/layout/stats-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { FilterToolbar } from "@/components/layout/filter-toolbar";
import { DataTableShell } from "@/components/layout/data-table-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { TBody, TD, TH, THead, Table, TR } from "@/components/ui/table";

type Role = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type BudgetCurrent = {
  id: string;
  amount: string | number;
  effectiveFrom: string;
  note?: string | null;
  quarterly: number;
};

type ExpenseSummary = {
  count: number;
  total: number;
  settled: number;
  unsettled: number;
  budgetTotal: number;
};

type BudgetHistoryItem = {
  id: string;
  amount: string | number;
  effectiveFrom: string;
  note?: string | null;
  createdBy?: {
    name: string | null;
    email: string;
  } | null;
};

type FundBalance = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  balance: number;
};

type FundOverview = {
  fund: {
    id: string;
    contributionAmount: string | number;
  } | null;
  balances: FundBalance[];
};

type FundAdjustment = {
  id: string;
  amount: string | number;
  reason: string;
  createdAt: string;
  employee: {
    id: string;
    name: string | null;
    email: string;
  };
  adjustedBy: {
    id: string;
    name: string | null;
    email: string;
  };
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

export function BudgetClient({ role }: { role: Role; userId: string }) {
  const queryClient = useQueryClient();
  const [isBudgetOpen, setIsBudgetOpen] = React.useState(false);
  const [isFundOpen, setIsFundOpen] = React.useState(false);
  const [budgetForm, setBudgetForm] = React.useState({
    amount: "",
    effectiveFrom: "",
    note: "",
  });
  const [fundForm, setFundForm] = React.useState({
    employeeId: "",
    amount: "",
    reason: "",
  });

  const budgetQuery = useQuery({
    queryKey: ["budget-current"],
    queryFn: async () => fetchJson<BudgetCurrent | null>("/api/budget/current"),
  });

  const summaryQuery = useQuery({
    queryKey: ["budget-expense-summary"],
    queryFn: async () => fetchJson<ExpenseSummary>("/api/expenses/summary"),
  });

  const fundQuery = useQuery({
    queryKey: ["budget-fund"],
    queryFn: async () => fetchJson<FundOverview>("/api/budget/fund"),
  });

  const budgetHistoryQuery = useQuery({
    queryKey: ["budget-history"],
    queryFn: async () => fetchJson<BudgetHistoryItem[]>("/api/budget/history"),
    enabled: role === "SUPER_ADMIN",
  });

  const fundAdjustmentsQuery = useQuery({
    queryKey: ["budget-fund-adjustments"],
    queryFn: async () => fetchJson<FundAdjustment[]>("/api/budget/fund/adjustments"),
    enabled: role === "SUPER_ADMIN",
  });

  const budget = budgetQuery.data?.data ?? null;
  const expenseSummary = summaryQuery.data?.data;
  const fund = fundQuery.data?.data;
  const budgetHistory = budgetHistoryQuery.data?.data ?? [];
  const fundAdjustments = fundAdjustmentsQuery.data?.data ?? [];

  const monthlyBudget = parseAmount(budget?.amount);
  const quarterlyBudget = budget?.quarterly ?? monthlyBudget * 3;
  const usage = expenseSummary?.budgetTotal ?? 0;
  const remaining = monthlyBudget - usage;
  const progress = monthlyBudget > 0 ? (usage / monthlyBudget) * 100 : 0;
  const isOverBudget = monthlyBudget > 0 && usage > monthlyBudget;

  const invalidateBudget = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budget-current"] }),
      queryClient.invalidateQueries({ queryKey: ["budget-expense-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["budget-fund"] }),
      queryClient.invalidateQueries({ queryKey: ["budget-history"] }),
      queryClient.invalidateQueries({ queryKey: ["budget-fund-adjustments"] }),
    ]);
  }, [queryClient]);

  const setBudgetMutation = useMutation({
    mutationFn: async (payload: typeof budgetForm) =>
      fetchJson("/api/budget/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payload.amount),
          effectiveFrom: payload.effectiveFrom,
          note: payload.note || null,
        }),
      }),
    onSuccess: async () => {
      setIsBudgetOpen(false);
      setBudgetForm({ amount: "", effectiveFrom: "", note: "" });
      await invalidateBudget();
    },
  });

  const adjustFundMutation = useMutation({
    mutationFn: async (payload: typeof fundForm) =>
      fetchJson("/api/budget/fund/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: payload.employeeId,
          amount: Number(payload.amount),
          reason: payload.reason,
        }),
      }),
    onSuccess: async () => {
      setIsFundOpen(false);
      setFundForm({ employeeId: fund?.balances[0]?.id || "", amount: "", reason: "" });
      await invalidateBudget();
    },
  });

  React.useEffect(() => {
    if (!fundForm.employeeId && fund?.balances[0]?.id) {
      setFundForm((current) => ({ ...current, employeeId: fund.balances[0]!.id }));
    }
  }, [fund?.balances, fundForm.employeeId]);

  const summaryCards = [
    {
      label: "Monthly budget",
      value: formatCompactCurrency(monthlyBudget),
      hint: formatCurrency(monthlyBudget),
      icon: <Landmark className="h-5 w-5" />,
    },
    {
      label: "Quarterly view",
      value: formatCompactCurrency(quarterlyBudget),
      hint: "Derived as monthly × 3",
      icon: <Scale className="h-5 w-5" />,
    },
    {
      label: "Current usage",
      value: formatCompactCurrency(usage),
      hint: "Food and other only",
      icon: <ReceiptText className="h-5 w-5" />,
    },
    {
      label: "Remaining",
      value: formatCompactCurrency(remaining),
      hint: isOverBudget ? "Budget exceeded" : "Available headroom",
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: "Fund contribution",
      value: formatCompactCurrency(fund?.fund?.contributionAmount),
      hint: "Per employee birthday year",
      icon: <PiggyBank className="h-5 w-5" />,
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance"
        title="Budget"
        description="Track company expense budget separately from the employee fund, with clearer visibility into usage, warnings, and adjustment activity."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {role === "SUPER_ADMIN" ? (
              <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Set Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">Set monthly budget</h2>
                    <p className="text-sm text-slate-500">Create a new effective monthly budget. Quarterly view will continue to derive automatically.</p>
                  </div>
                  <BudgetForm
                    form={budgetForm}
                    onChange={setBudgetForm}
                    isSubmitting={setBudgetMutation.isPending}
                    onCancel={() => setIsBudgetOpen(false)}
                    onSubmit={() => setBudgetMutation.mutateAsync(budgetForm)}
                  />
                </DialogContent>
              </Dialog>
            ) : null}

            {role === "SUPER_ADMIN" ? (
              <Dialog open={isFundOpen} onOpenChange={setIsFundOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <Coins className="mr-2 h-4 w-4" />
                    Adjust Fund
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">Adjust employee fund</h2>
                    <p className="text-sm text-slate-500">Apply a manual adjustment with a required reason. This remains separate from the company budget.</p>
                  </div>
                  <FundAdjustmentForm
                    balances={fund?.balances ?? []}
                    form={fundForm}
                    onChange={setFundForm}
                    isSubmitting={adjustFundMutation.isPending}
                    onCancel={() => setIsFundOpen(false)}
                    onSubmit={() => adjustFundMutation.mutateAsync(fundForm)}
                  />
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StaggerItem key={card.label}>
            <StatsCard label={card.label} value={card.value} hint={card.hint} icon={card.icon} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-950">Company budget overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <FinanceRow label="Monthly ceiling" value={formatCurrency(monthlyBudget)} />
              <FinanceRow label="Derived quarterly" value={formatCurrency(quarterlyBudget)} />
              <FinanceRow label="Budget-counted usage" value={formatCurrency(usage)} />
              <FinanceRow label="Remaining amount" value={formatCurrency(remaining)} />
            </div>

            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Usage against monthly budget</p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(usage)} of {formatCurrency(monthlyBudget)} used
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-950">{Math.round(progress)}%</p>
              </div>
              <Progress value={progress} />
              {isOverBudget ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-amber-100 p-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-900">Over budget</p>
                      <p className="text-sm leading-6 text-amber-800/90">
                        Usage is above the current monthly budget by {formatCurrency(Math.abs(remaining))}. This is a warning only and does not block submissions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-emerald-100 p-2 text-emerald-700">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-900">Within planned range</p>
                      <p className="text-sm leading-6 text-emerald-800/90">
                        Remaining headroom is {formatCurrency(remaining)} for the current monthly budget window.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-950">Budget notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GuidanceRow
              icon={<Landmark className="h-4 w-4" />}
              title="Company budget"
              description="Food and other expenses count toward the monthly company budget."
            />
            <GuidanceRow
              icon={<PiggyBank className="h-4 w-4" />}
              title="Employee fund"
              description="The employee fund is a separate system with annual birthday contributions and manual adjustments."
            />
            {budget ? (
              <div className="border-t border-[var(--border)] py-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Current effective from</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(budget.effectiveFrom)}</p>
                {budget.note ? <p className="mt-2 text-sm leading-6 text-slate-600">{budget.note}</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Employee fund</p>
            <p className="text-sm text-slate-500">Balances and adjustment history stay separate from company spend, with cleaner financial visibility.</p>
          </div>
          {role === "SUPER_ADMIN" ? (
            <Button type="button" variant="ghost" className="h-10 rounded-md px-3 text-slate-600" onClick={() => invalidateBudget()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          ) : null}
        </div>
      </FilterToolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <DataTableShell
          title="Fund balances"
          description="Current employee fund balances derived from contributions plus manual adjustments."
        >
          {fundQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (fund?.balances.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No fund balances yet"
                description="Employee fund balances will appear once contributions or adjustments exist."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <div className="max-h-[620px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Employee</TH>
                      <TH>Role</TH>
                      <TH className="text-right">Balance</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {fund?.balances.map((item) => (
                      <TR key={item.id}>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{item.name || item.email}</p>
                            <p className="text-xs text-slate-500">{item.email}</p>
                          </div>
                        </TD>
                        <TD>
                          <StatusBadge status={item.role === "SUPER_ADMIN" ? "Admin" : "Employee"} />
                        </TD>
                        <TD className="text-right font-semibold text-slate-950">{formatCurrency(item.balance)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </DataTableShell>

        <DataTableShell
          title="Fund adjustment history"
          description="A finance-friendly view of manual employee fund changes."
        >
          {role === "EMPLOYEE" ? (
            <div className="p-6">
              <EmptyState
                title="Adjustment history not available"
                description="Managers and super admins can review the adjustment ledger here."
              />
            </div>
          ) : fundAdjustmentsQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : fundAdjustments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No fund adjustments yet"
                description="Manual changes to the employee fund will appear here with reason and actor context."
              />
            </div>
          ) : (
            <div className="space-y-3 p-6">
              {fundAdjustments.map((item) => (
                <div key={item.id} className="border-b border-[var(--border)] py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950">{item.employee.name || item.employee.email}</p>
                      <p className="text-xs text-slate-500">
                        Adjusted by {item.adjustedBy.name || item.adjustedBy.email} on {formatDate(item.createdAt)}
                      </p>
                      <p className="text-sm leading-6 text-slate-600">{item.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-950">{formatCurrency(item.amount)}</p>
                      <StatusBadge status={parseAmount(item.amount) >= 0 ? "approved" : "rejected"} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DataTableShell>
      </div>

      {role === "SUPER_ADMIN" ? (
        <DataTableShell
          title="Budget history"
          description="Recent monthly budget entries and their effective dates."
        >
          {budgetHistoryQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : budgetHistory.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No budget history yet"
                description="Set a monthly budget to start building the finance timeline."
                action={
                  role === "SUPER_ADMIN" ? (
                    <Button type="button" onClick={() => setIsBudgetOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Set budget
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Effective from</TH>
                      <TH>Monthly amount</TH>
                      <TH>Created by</TH>
                      <TH>Note</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {budgetHistory.map((item) => (
                      <TR key={item.id}>
                        <TD className="font-medium text-slate-950">{formatDate(item.effectiveFrom)}</TD>
                        <TD className="font-semibold text-slate-950">{formatCurrency(item.amount)}</TD>
                        <TD>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-900">{item.createdBy?.name || item.createdBy?.email || "—"}</p>
                          </div>
                        </TD>
                        <TD className="text-slate-600">{item.note || "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </DataTableShell>
      ) : null}
    </div>
  );
}

function FinanceRow({ label, value }: { label: string; value: string }) {
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

function BudgetForm({
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  form: {
    amount: string;
    effectiveFrom: string;
    note: string;
  };
  onChange: React.Dispatch<
    React.SetStateAction<{
      amount: string;
      effectiveFrom: string;
      note: string;
    }>
  >;
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
          <span className="text-sm font-medium text-slate-700">Monthly amount</span>
          <Input type="number" min={0} step="0.01" value={form.amount} onChange={(event) => onChange((current) => ({ ...current, amount: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Effective from</span>
          <Input type="date" value={form.effectiveFrom} onChange={(event) => onChange((current) => ({ ...current, effectiveFrom: event.target.value }))} required />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Note</span>
          <textarea
            className="min-h-[120px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.note}
            onChange={(event) => onChange((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional context for the new budget"
          />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save budget"}
        </Button>
      </div>
    </form>
  );
}

function FundAdjustmentForm({
  balances,
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  balances: FundBalance[];
  form: {
    employeeId: string;
    amount: string;
    reason: string;
  };
  onChange: React.Dispatch<
    React.SetStateAction<{
      employeeId: string;
      amount: string;
      reason: string;
    }>
  >;
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
      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Employee</span>
          <select
            className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.employeeId}
            onChange={(event) => onChange((current) => ({ ...current, employeeId: event.target.value }))}
          >
            {balances.map((balance) => (
              <option key={balance.id} value={balance.id}>
                {balance.name || balance.email}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Adjustment amount</span>
          <Input type="number" step="0.01" value={form.amount} onChange={(event) => onChange((current) => ({ ...current, amount: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            className="min-h-[120px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.reason}
            onChange={(event) => onChange((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Why is this adjustment needed?"
            required
          />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Apply adjustment"}
        </Button>
      </div>
    </form>
  );
}
