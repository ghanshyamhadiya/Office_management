"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Coins,
  Plus,
  ReceiptText,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SummaryCard } from "@/components/layout/summary-card";
import { getInitials } from "@/components/layout/nav-items";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ease, spring } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { features } from "@/lib/features";

type Role = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";
export type DashboardStats = {
  scope: "all" | "me";
  budget: { monthly: number; quarterly: number; spent: number };
  expenses: { count: number; total: number; settled: number; unsettled: number };
  pendingLeave: number;
  pendingTrips: number;
  fund: { balances: Array<{ id: string; name: string | null; email: string; role: string; balance: number }> };
  leaveBalances: Array<{
    id: string; userId: string; userName: string | null; userEmail: string; leaveTypeName: string; extraDays: number;
    summary: { total: number; used: number; remaining: number };
  }>;
  quarterlyFood: Array<{ label: string; total: number }>;
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const formatCurrency = (value: number) => currency.format(value);
const formatPercent = (value: number) => `${Math.round(value)}%`;

async function fetchStats(scope: string): Promise<DashboardStats> {
  const response = await fetch(`/api/dashboard/stats?scope=${scope}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.message || "Could not load your overview.");
  return payload.data;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardClient({ role, userName, initialStats }: { role: Role; userName: string; initialStats?: DashboardStats | null }) {
  const canScope = role === "SUPER_ADMIN";
  const initialScope = canScope ? "all" : "me";
  const [scope, setScope] = React.useState<"all" | "me">(initialScope);
  const reduced = useReducedMotion();
  const [initialLoadedAt] = React.useState(() => Date.now());
  const query = useQuery({
    queryKey: ["dashboard-stats", scope],
    queryFn: () => fetchStats(scope),
    initialData: scope === initialScope && initialStats ? initialStats : undefined,
    initialDataUpdatedAt: initialLoadedAt,
    placeholderData: (previous) => previous,
  });
  const stats = query.data;
  const maxQuarter = Math.max(1, ...(stats?.quarterlyFood.map((item) => item.total) ?? []));
  const hasBudget = Boolean(stats && stats.budget.monthly > 0);
  const budgetUsage = hasBudget && stats ? (stats.budget.spent / stats.budget.monthly) * 100 : 0;
  const remaining = stats ? stats.budget.monthly - stats.budget.spent : 0;
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  const quickActions = [
    { href: "/expenses?new=1", label: "Submit an expense", description: "Add a new receipt or claim", icon: Plus },
    { href: "/expenses", label: "Review expenses", description: stats ? `${formatCurrency(stats.expenses.unsettled)} awaiting settlement` : "Open the expense register", icon: ReceiptText },
    { href: "/budget", label: "Budget & fund", description: "Monthly budget and employee fund", icon: Coins },
    ...(role === "SUPER_ADMIN" ? [{ href: "/users", label: "Manage people", description: "Roles, invites and access", icon: Users }] : []),
    ...(features.leave ? [{ href: "/leave", label: "Leave requests", description: `${stats?.pendingLeave ?? 0} pending`, icon: CalendarClock }] : []),
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        title={`${greeting()}, ${firstName}`}
        description="Here’s what’s happening with office spending today."
        actions={
          <>
            {canScope ? (
              <div role="group" aria-label="Overview scope" className="flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
                {(["all", "me"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={scope === value}
                    onClick={() => setScope(value)}
                    className={`relative h-8 rounded px-3 text-[13px] font-medium transition-colors ${scope === value ? "text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                  >
                    {scope === value ? <motion.span layoutId="dashboard-scope" transition={spring.snappy} className="absolute inset-0 rounded bg-[var(--accent)]" /> : null}
                    <span className="relative">{value === "all" ? "Team" : "Only me"}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <Button asChild><Link href="/expenses?new=1"><Plus className="h-4 w-4" />New expense</Link></Button>
          </>
        }
      />

      {query.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{stats ? "Could not refresh the overview. Showing the last loaded data." : "We couldn’t load your overview. Please try again."}</span>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className="h-4 w-4" />Retry</Button>
        </div>
      ) : null}

      {!stats && query.isPending ? (
        <div aria-busy="true" aria-label="Loading overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton className="h-[104px]" key={index} />)}
          </div>
          <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-80 xl:col-span-2" /><Skeleton className="h-80" /></div>
        </div>
      ) : null}

      {stats ? (
        <div className={`page-stack transition-opacity duration-200 ${query.isFetching && query.isPlaceholderData ? "opacity-60" : ""}`}>
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" stagger={0.06}>
            <StaggerItem><SummaryCard label="Total submitted" icon={<Wallet />} value={<AnimatedNumber value={stats.expenses.total} format={formatCurrency} />} hint={`${stats.expenses.count} active ${stats.expenses.count === 1 ? "expense" : "expenses"}`} /></StaggerItem>
            <StaggerItem><SummaryCard label="Awaiting settlement" icon={<Clock3 />} value={<AnimatedNumber value={stats.expenses.unsettled} format={formatCurrency} />} hint="Still to be reimbursed" /></StaggerItem>
            <StaggerItem><SummaryCard label="Settled" icon={<CheckCircle2 />} value={<AnimatedNumber value={stats.expenses.settled} format={formatCurrency} />} hint="Reimbursed to employees" /></StaggerItem>
            <StaggerItem><SummaryCard label="Budget used this month" icon={<Coins />} value={hasBudget ? <AnimatedNumber value={budgetUsage} format={formatPercent} /> : "—"} hint={hasBudget ? `of ${formatCurrency(stats.budget.monthly)}` : "No budget set yet"} /></StaggerItem>
          </Stagger>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-[var(--border)]">
                <div>
                  <CardTitle>Food spending by quarter</CardTitle>
                  <CardDescription>Active food expenses this year · archived excluded</CardDescription>
                </div>
                <Link href="/expenses" className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--primary)] hover:underline">View all<ArrowRight className="h-3.5 w-3.5" /></Link>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid h-64 grid-cols-4 items-end gap-4 border-b border-[var(--border)] sm:gap-8">
                  {stats.quarterlyFood.map((item, index) => (
                    <div key={item.label} className="flex h-full flex-col items-center justify-end gap-2">
                      <span className="text-xs font-medium tabular-nums text-[var(--muted-foreground)]">{formatCurrency(item.total)}</span>
                      <motion.div
                        className="w-full max-w-14 origin-bottom rounded-t-md bg-[var(--primary)]"
                        style={{ height: `${Math.max(item.total > 0 ? 3 : 1, (item.total / maxQuarter) * 85)}%`, opacity: item.total > 0 ? 1 : 0.25 }}
                        initial={reduced ? false : { scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.6, delay: 0.1 + index * 0.07, ease: ease.out }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-4 text-center text-xs text-[var(--muted-foreground)] sm:gap-8">
                  {stats.quarterlyFood.map((item) => <span key={item.label}>{item.label}</span>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-[var(--border)]">
                <CardTitle>Monthly budget</CardTitle>
                <CardDescription>Food and other expenses this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-[var(--heading)]"><AnimatedNumber value={stats.budget.spent} format={formatCurrency} /></p>
                  <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">{hasBudget ? `spent of ${formatCurrency(stats.budget.monthly)}` : "No monthly budget has been set"}</p>
                </div>
                <Progress value={budgetUsage} />
                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-md bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">{remaining < 0 ? "Over budget" : "Remaining"}</dt>
                    <dd className={`mt-1 font-semibold tabular-nums ${remaining < 0 ? "text-[var(--destructive)]" : "text-[var(--heading)]"}`}>{hasBudget ? formatCurrency(Math.abs(remaining)) : "—"}</dd>
                  </div>
                  <div className="rounded-md bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">Quarter reference</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-[var(--heading)]">{hasBudget ? formatCurrency(stats.budget.quarterly) : "—"}</dd>
                  </div>
                </dl>
                <Button asChild variant="outline" className="w-full"><Link href="/budget">Open budget</Link></Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-[var(--border)]">
                <div>
                  <CardTitle>Employee fund</CardTitle>
                  <CardDescription>Birthday contributions and adjustments per person</CardDescription>
                </div>
                <Link href="/budget" className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-[var(--primary)] hover:underline">Details<ArrowRight className="h-3.5 w-3.5" /></Link>
              </CardHeader>
              {stats.fund.balances.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {stats.fund.balances.slice(0, 6).map((person, index) => (
                    <motion.li
                      key={person.id}
                      initial={reduced ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index, duration: 0.25 }}
                      className="interactive-row flex items-center gap-3 px-5 py-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-[var(--accent-foreground)]">{getInitials(person.name || person.email)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--heading)]">{person.name || person.email}</span>
                        <span className="block truncate text-xs capitalize text-[var(--muted-foreground)]">{person.role === "SUPER_ADMIN" ? "Admin" : "Employee"}</span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[var(--heading)]">{formatCurrency(person.balance)}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <CardContent className="pt-5"><EmptyState title="No fund activity yet" description="Balances appear once birthday contributions are recorded." /></CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="border-b border-[var(--border)]">
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Jump straight to common tasks</CardDescription>
              </CardHeader>
              <ul className="p-2">
                {quickActions.map((action) => (
                  <li key={action.href}>
                    <Link href={action.href} className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--hover)]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]"><action.icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-[var(--heading)]">{action.label}</span>
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {features.leave ? (
            <Card>
              <CardHeader className="border-b border-[var(--border)]"><CardTitle>Leave balances</CardTitle></CardHeader>
              {stats.leaveBalances.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {stats.leaveBalances.map((item) => (
                    <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                      <span>{item.userName || item.userEmail} · {item.leaveTypeName}</span>
                      <span className="tabular-nums text-[var(--muted-foreground)]">{item.summary.remaining} of {item.summary.total} left</span>
                    </li>
                  ))}
                </ul>
              ) : <CardContent className="pt-5"><EmptyState title="No leave balances" description="Leave balances appear once available." /></CardContent>}
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
