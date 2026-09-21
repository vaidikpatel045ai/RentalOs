import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  Shirt,
  CalendarDays,
  CalendarClock,
  ClipboardList,
  Scissors,
  Sparkles,
  Truck,
  Wallet,
  BarChart3,
  UserCog,
  Building2,
  Settings,
  ScrollText,
  PackageSearch,
  Factory,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { can, homeRouteForRole, type Resource } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  resource: Resource;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "__home__", icon: LayoutDashboard, resource: "dashboard.owner" },
  { label: "Bookings", href: "/dashboard/bookings", icon: ClipboardList, resource: "bookings" },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays, resource: "calendar" },
  { label: "Appointments", href: "/dashboard/appointments", icon: CalendarClock, resource: "appointments" },
  { label: "Customers", href: "/dashboard/customers", icon: Users, resource: "customers" },
  { label: "Inventory", href: "/dashboard/garments", icon: Shirt, resource: "garments" },
  { label: "Packages", href: "/dashboard/packages", icon: PackageSearch, resource: "packages" },
  { label: "Tailoring", href: "/dashboard/tailoring", icon: Scissors, resource: "tailoring" },
  { label: "Cleaning", href: "/dashboard/cleaning", icon: Sparkles, resource: "cleaning" },
  { label: "Delivery & Pickup", href: "/dashboard/delivery", icon: Truck, resource: "delivery" },
  { label: "Transfers", href: "/dashboard/transfers", icon: ArrowLeftRight, resource: "transfers" },
  { label: "Payments", href: "/dashboard/payments", icon: Wallet, resource: "payments" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, resource: "reports" },
  { label: "Suppliers", href: "/dashboard/suppliers", icon: Factory, resource: "suppliers" },
  { label: "Staff", href: "/dashboard/staff", icon: UserCog, resource: "staff" },
  { label: "Branches", href: "/dashboard/branches", icon: Building2, resource: "branches" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, resource: "settings" },
  { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText, resource: "auditLog" },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.href === "__home__") return can(role, "dashboard.owner", "view") || true; // dashboard link always shown, resolved below
    // Map generic resource permission check; dashboard.* are per-role, so
    // approximate "can see this resource at all" via any action allowed.
    return (
      can(role, item.resource, "view") ||
      can(role, item.resource, "create") ||
      can(role, item.resource, "update")
    );
  }).map((item) => (item.href === "__home__" ? { ...item, href: homeRouteForRole(role) } : item));
}
