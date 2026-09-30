"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  MailPlus,
  Plus,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
  UserCog,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
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
import { features } from "@/lib/features";

type Role = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";
type UserRole = "SUPER_ADMIN" | "MANAGER" | "EMPLOYEE";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  birthday?: string | null;
};

type InviteItem = {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  invitedBy?: {
    name: string | null;
    email: string;
  } | null;
};

type LeaveType = {
  id: string;
  name: string;
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

function roleLabel(role: UserRole) {
  return role === "SUPER_ADMIN" ? "Admin" : "Employee";
}

export function UsersClient({ role }: { role: Role; userId: string }) {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = React.useState<"ALL" | UserRole>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [detailUser, setDetailUser] = React.useState<UserItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "",
    email: "",
    role: "EMPLOYEE" as UserRole,
    birthday: "",
    tempPassword: "",
  });
  const [inviteForm, setInviteForm] = React.useState({
    email: "",
    role: "EMPLOYEE" as UserRole,
    name: "",
  });
  const [resetPassword, setResetPassword] = React.useState("");
  const [extraLeave, setExtraLeave] = React.useState({
    leaveTypeId: "",
    year: new Date().getFullYear().toString(),
    days: "",
    reason: "",
  });

  const usersQuery = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => fetchJson<UserItem[]>("/api/users"),
  });

  const invitesQuery = useQuery({
    queryKey: ["user-invites"],
    queryFn: async () => fetchJson<InviteItem[]>("/api/users/invites"),
    enabled: role === "SUPER_ADMIN",
  });

  const leaveTypesQuery = useQuery({
    queryKey: ["leave-types-users"],
    queryFn: async () => fetchJson<LeaveType[]>("/api/leave/types"),
    staleTime: 60_000,
    enabled: features.leave,
  });

  const users = React.useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const invites = React.useMemo(() => invitesQuery.data?.data ?? [], [invitesQuery.data]);
  const leaveTypes = React.useMemo(() => leaveTypesQuery.data?.data ?? [], [leaveTypesQuery.data]);

  const filteredUsers = React.useMemo(
    () =>
      users.filter((user) => {
        if (roleFilter === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") return false;
        if (roleFilter === "EMPLOYEE" && user.role === "SUPER_ADMIN") return false;
        if (statusFilter === "ACTIVE" && !user.isActive) return false;
        if (statusFilter === "INACTIVE" && user.isActive) return false;
        return true;
      }),
    [roleFilter, statusFilter, users],
  );

  const summary = React.useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.role === "SUPER_ADMIN").length,
      employees: users.filter((user) => user.role !== "SUPER_ADMIN").length,
      pendingInvites: invites.filter((invite) => !invite.acceptedAt && !invite.revokedAt).length,
    }),
    [invites, users],
  );

  const invalidateUsers = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["users-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["user-invites"] }),
    ]);
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) =>
      fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          birthday: payload.birthday || null,
        }),
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        role: "EMPLOYEE",
        birthday: "",
        tempPassword: "",
      });
      await invalidateUsers();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: typeof inviteForm) =>
      fetchJson("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          name: payload.name || null,
        }),
      }),
    onSuccess: async () => {
      setIsInviteOpen(false);
      setInviteForm({
        email: "",
        role: "EMPLOYEE",
        name: "",
      });
      await invalidateUsers();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<UserItem, "name" | "role" | "isActive">> & {
        birthday?: string | null;
      };
    }) =>
      fetchJson(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await invalidateUsers();
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      fetchJson(`/api/users/${id}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      }),
    onSuccess: async () => {
      setResetPassword("");
    },
  });

  const extraLeaveMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: typeof extraLeave;
    }) =>
      fetchJson(`/api/users/${id}/extra-leaves`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          year: Number(payload.year),
          days: Number(payload.days),
        }),
      }),
    onSuccess: async () => {
      setExtraLeave({
        leaveTypeId: leaveTypes[0]?.id || "",
        year: new Date().getFullYear().toString(),
        days: "",
        reason: "",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async (id: string) =>
      fetchJson(`/api/users/invites/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await invalidateUsers();
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (id: string) =>
      fetchJson(`/api/users/invites/${id}/resend`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await invalidateUsers();
    },
  });

  React.useEffect(() => {
    if (!detailUser) return;
    const next = users.find((user) => user.id === detailUser.id) || null;
    setDetailUser(next);
  }, [detailUser, users]);

  React.useEffect(() => {
    if (!extraLeave.leaveTypeId && leaveTypes[0]?.id) {
      setExtraLeave((current) => ({ ...current, leaveTypeId: leaveTypes[0]!.id }));
    }
  }, [extraLeave.leaveTypeId, leaveTypes]);

  const summaryCards = [
    { label: "Total users", value: summary.total, hint: "Current scope", icon: <Users className="h-5 w-5" /> },
    { label: "Active users", value: summary.active, hint: "Can access OfficeFlow", icon: <UserRoundCheck className="h-5 w-5" /> },
    { label: "Admins", value: summary.admins, hint: "Full access", icon: <Shield className="h-5 w-5" /> },
    { label: "Employees", value: summary.employees, hint: "Submit their own expenses", icon: <UserRound className="h-5 w-5" /> },
    { label: "Pending invites", value: summary.pendingInvites, hint: "Not yet accepted", icon: <MailPlus className="h-5 w-5" /> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description={`Manage people, access roles, onboarding flows, passwords${features.leave ? ", and leave-related admin actions" : ""} from one control surface.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {role === "SUPER_ADMIN" ? (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl">
                  <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">Create user</h2>
                    <p className="text-sm text-slate-500">Create a direct account with a temp password and force-change-password flow.</p>
                  </div>
                  <UserCreateForm
                    form={createForm}
                    onChange={setCreateForm}
                    isSubmitting={createMutation.isPending}
                    onCancel={() => setIsCreateOpen(false)}
                    onSubmit={() => createMutation.mutateAsync(createForm)}
                  />
                </DialogContent>
              </Dialog>
            ) : null}

            {role === "SUPER_ADMIN" ? (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <MailPlus className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <div className="mb-5 space-y-1">
                    <h2 className="text-lg font-semibold text-slate-950">Invite user</h2>
                    <p className="text-sm text-slate-500">Send an invite email with the existing 48-hour acceptance flow.</p>
                  </div>
                  <UserInviteForm
                    form={inviteForm}
                    onChange={setInviteForm}
                    isSubmitting={inviteMutation.isPending}
                    onCancel={() => setIsInviteOpen(false)}
                    onSubmit={() => inviteMutation.mutateAsync(inviteForm)}
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

      <FilterToolbar className="flex-col items-stretch gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">User filters</p>
            <p className="text-sm text-slate-500">Focus on a specific role or access state while keeping admin actions one click away.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-md px-3 text-slate-600"
            onClick={() => {
              setRoleFilter("ALL");
              setStatusFilter("ALL");
            }}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset view
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FilterCard title="All roles" description="Everyone in scope" active={roleFilter === "ALL"} onClick={() => setRoleFilter("ALL")} />
          <FilterCard title="Admins" description="Full access" active={roleFilter === "SUPER_ADMIN"} onClick={() => setRoleFilter("SUPER_ADMIN")} />
          <FilterCard title="Employees" description="Submit their own expenses" active={roleFilter === "EMPLOYEE"} onClick={() => setRoleFilter("EMPLOYEE")} />
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={statusFilter === status ? "default" : "outline"}
                  className="h-9 rounded-lg"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </FilterToolbar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,0.95fr)]">
        <DataTableShell
          title="User directory"
          description="Everyone with access to OfficeFlow, their role and status."
        >
          {usersQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-6">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No users in this view"
                description="Adjust filters or create a new user to start building the team directory."
                action={
                  role === "SUPER_ADMIN" ? (
                    <Button type="button" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create user
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200/80">
              <div className="max-h-[720px] overflow-auto">
                <Table>
                  <THead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <TR>
                      <TH>Name</TH>
                      <TH>Email</TH>
                      <TH>Role</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredUsers.map((user) => (
                      <TR key={user.id}>
                        <TD>
                          <div className="space-y-1">
                            <p className="font-medium text-slate-950">{user.name || "Unnamed user"}</p>
                            <p className="text-xs text-slate-500">{user.birthday ? `Birthday ${formatDate(user.birthday)}` : "No birthday set"}</p>
                          </div>
                        </TD>
                        <TD className="text-slate-700">{user.email}</TD>
                        <TD>
                          <StatusBadge status={roleLabel(user.role)} className="capitalize" />
                        </TD>
                        <TD>
                          <StatusBadge status={user.isActive ? "active" : "archived"} />
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                              onClick={() => {
                                setDetailUser(user);
                                setResetPassword("");
                              }}
                            >
                              <UserCog className="mr-1.5 h-3.5 w-3.5" />
                              View
                            </Button>
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
              <CardTitle className="text-base font-semibold text-slate-950">User actions</CardTitle>
            </CardHeader>
            <CardContent>
              {detailUser ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{detailUser.name || detailUser.email}</p>
                        <p className="text-sm text-slate-500">{detailUser.email}</p>
                      </div>
                      <StatusBadge status={detailUser.isActive ? "active" : "archived"} />
                    </div>
                    <div className="grid gap-3">
                      <InfoRow label="Role" value={roleLabel(detailUser.role)} />
                      <InfoRow label="Birthday" value={formatDate(detailUser.birthday)} />
                    </div>
                  </div>

                  {role === "SUPER_ADMIN" ? (
                    <div className="space-y-3 border-t border-[var(--border)] py-4">
                      <p className="text-sm font-semibold text-slate-900">Password reset</p>
                      <Input
                        type="password"
                        value={resetPassword}
                        onChange={(event) => setResetPassword(event.target.value)}
                        placeholder="New temporary password"
                      />
                      <Button
                        type="button"
                        disabled={resetMutation.isPending || resetPassword.length < 8}
                        onClick={() =>
                          resetMutation.mutate({
                            id: detailUser.id,
                            password: resetPassword,
                          })
                        }
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Reset password
                      </Button>
                    </div>
                  ) : null}

                  {features.leave && role === "SUPER_ADMIN" ? (
                    <div className="space-y-3 border-t border-[var(--border)] py-4">
                      <p className="text-sm font-semibold text-slate-900">Add extra leave</p>
                      <div className="grid gap-3">
                        <select
                          className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
                          value={extraLeave.leaveTypeId}
                          onChange={(event) => setExtraLeave((current) => ({ ...current, leaveTypeId: event.target.value }))}
                        >
                          {leaveTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input value={extraLeave.year} onChange={(event) => setExtraLeave((current) => ({ ...current, year: event.target.value }))} placeholder="Year" />
                          <Input value={extraLeave.days} onChange={(event) => setExtraLeave((current) => ({ ...current, days: event.target.value }))} placeholder="Days" />
                        </div>
                        <textarea
                          className="min-h-[110px] w-full px-3 py-2 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
                          value={extraLeave.reason}
                          onChange={(event) => setExtraLeave((current) => ({ ...current, reason: event.target.value }))}
                          placeholder="Reason for extra leave"
                        />
                      </div>
                      <Button
                        type="button"
                        disabled={extraLeaveMutation.isPending || !extraLeave.leaveTypeId || !extraLeave.days || extraLeave.reason.length < 3}
                        onClick={() =>
                          extraLeaveMutation.mutate({
                            id: detailUser.id,
                            payload: extraLeave,
                          })
                        }
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Add extra leave
                      </Button>
                    </div>
                  ) : null}

                  {role === "SUPER_ADMIN" ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          updateMutation.mutate({
                            id: detailUser.id,
                            payload: { isActive: !detailUser.isActive },
                          })
                        }
                      >
                        {detailUser.isActive ? <UserRoundX className="mr-2 h-4 w-4" /> : <UserRoundCheck className="mr-2 h-4 w-4" />}
                        {detailUser.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="Select a user"
                  description={features.leave ? "Open a user row to see admin actions, reset password, and apply extra leave." : "Open a user row to see admin actions and reset password."}
                />
              )}
            </CardContent>
          </Card>

          {role === "SUPER_ADMIN" ? (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-slate-950">Pending invites</CardTitle>
              </CardHeader>
              <CardContent>
                {invitesQuery.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-lg border border-slate-200/80 bg-white px-4 py-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : invites.length === 0 ? (
                  <EmptyState
                    title="No invites pending"
                    description="Invite-based onboarding will appear here once sent."
                    action={
                      <Button type="button" onClick={() => setIsInviteOpen(true)}>
                        <MailPlus className="mr-2 h-4 w-4" />
                        Invite user
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="border-t border-[var(--border)] py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-950">{invite.name || invite.email}</p>
                            <p className="text-xs text-slate-500">{invite.email}</p>
                            <p className="text-xs text-slate-500">
                              Expires {formatDate(invite.expiresAt)} · {roleLabel(invite.role)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!invite.revokedAt && !invite.acceptedAt ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  onClick={() => resendInviteMutation.mutate(invite.id)}
                                >
                                  <Send className="mr-1.5 h-3.5 w-3.5" />
                                  Resend
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  onClick={() => revokeInviteMutation.mutate(invite.id)}
                                >
                                  Revoke
                                </Button>
                              </>
                            ) : (
                              <StatusBadge status={invite.acceptedAt ? "approved" : "archived"} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterCard({
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
        "rounded-lg border px-4 py-3 text-left transition",
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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-right text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function UserCreateForm({
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  form: {
    name: string;
    email: string;
    role: UserRole;
    birthday: string;
    tempPassword: string;
  };
  onChange: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      role: UserRole;
      birthday: string;
      tempPassword: string;
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
          <span className="text-sm font-medium text-slate-700">Name</span>
          <Input value={form.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <Input type="email" value={form.email} onChange={(event) => onChange((current) => ({ ...current, email: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.role}
            onChange={(event) => onChange((current) => ({ ...current, role: event.target.value as UserRole }))}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="SUPER_ADMIN">Admin</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Birthday</span>
          <Input type="date" value={form.birthday} onChange={(event) => onChange((current) => ({ ...current, birthday: event.target.value }))} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Temp password</span>
          <Input type="password" value={form.tempPassword} onChange={(event) => onChange((current) => ({ ...current, tempPassword: event.target.value }))} required />
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create user"}
        </Button>
      </div>
    </form>
  );
}

function UserInviteForm({
  form,
  onChange,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  form: {
    email: string;
    role: UserRole;
    name: string;
  };
  onChange: React.Dispatch<
    React.SetStateAction<{
      email: string;
      role: UserRole;
      name: string;
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
          <span className="text-sm font-medium text-slate-700">Email</span>
          <Input type="email" value={form.email} onChange={(event) => onChange((current) => ({ ...current, email: event.target.value }))} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Suggested name</span>
          <Input value={form.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            className="flex h-9 w-full px-3 rounded-md border border-[var(--input)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] focus:border-[var(--ring)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_30%,transparent)]"
            value={form.role}
            onChange={(event) => onChange((current) => ({ ...current, role: event.target.value as UserRole }))}
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="SUPER_ADMIN">Admin</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send invite"}
        </Button>
      </div>
    </form>
  );
}
