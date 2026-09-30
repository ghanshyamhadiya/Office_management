import { BarChart3, BriefcaseBusiness, CalendarRange, Coins, Receipt, Shield, UserCircle2, Users } from "lucide-react";
import type { Role } from "@prisma/client";
import { features, type FeatureKey } from "@/lib/features";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  group: NavGroup;
  feature?: FeatureKey;
};

export type NavGroup = "Overview" | "Finance" | "People" | "Administration" | "Account";

const everyone: Role[] = ["SUPER_ADMIN", "EMPLOYEE"];

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Spending, budget and team fund at a glance", icon: BarChart3, roles: everyone, group: "Overview" },
  { href: "/expenses", label: "Expenses", description: "Submit, review and settle expenses", icon: Receipt, roles: everyone, group: "Finance" },
  { href: "/budget", label: "Budget & fund", description: "Monthly budget and employee fund", icon: Coins, roles: everyone, group: "Finance" },
  { href: "/trips", label: "Trips", description: "Travel requests and itineraries", icon: BriefcaseBusiness, roles: everyone, group: "Finance", feature: "trips" },
  { href: "/leave", label: "Leave", description: "Leave requests and balances", icon: CalendarRange, roles: everyone, group: "People", feature: "leave" },
  { href: "/users", label: "Users", description: "People, roles and invitations", icon: Users, roles: ["SUPER_ADMIN"], group: "Administration" },
  { href: "/audit-logs", label: "Audit logs", description: "History of sensitive actions", icon: Shield, roles: ["SUPER_ADMIN"], group: "Administration" },
  { href: "/profile", label: "Profile", description: "Your account and notifications", icon: UserCircle2, roles: everyone, group: "Account" },
];

const groupOrder: NavGroup[] = ["Overview", "Finance", "People", "Administration", "Account"];

export function getNavItems(role: Role) {
  return allNavItems.filter((item) => item.roles.includes(role) && (!item.feature || features[item.feature]));
}

export function getNavGroups(role: Role) {
  const items = getNavItems(role);
  return groupOrder
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);
}

export function findNavItem(pathname: string) {
  return allNavItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
