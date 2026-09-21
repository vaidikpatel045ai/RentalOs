import type { Role } from "@prisma/client";

/**
 * Centralized RBAC. Both the route middleware and every server
 * action/route handler must consult this — never gate on the client alone.
 */

export type Resource =
  | "dashboard.owner"
  | "dashboard.manager"
  | "dashboard.sales"
  | "dashboard.stylist"
  | "dashboard.tailor"
  | "dashboard.cleaner"
  | "dashboard.delivery"
  | "dashboard.customer"
  | "customers"
  | "garments"
  | "bookings"
  | "appointments"
  | "calendar"
  | "tailoring"
  | "cleaning"
  | "delivery"
  | "payments"
  | "reports"
  | "staff"
  | "branches"
  | "settings"
  | "auditLog"
  | "conditionReports"
  | "packages"
  | "suppliers"
  | "documents"
  | "transfers";

export type Action = "view" | "create" | "update" | "delete" | "approve";

/**
 * Roles that see the internal admin/ops shell (dashboard layout, sidebar
 * nav). TAILOR/CLEANER/DELIVERY get their own dedicated mobile-first
 * portals (future phase); CUSTOMER gets the customer portal (future phase).
 */
export const ADMIN_SHELL_ROLES: Role[] = ["OWNER", "MANAGER", "SALES", "STYLIST"];

const FULL_ACCESS: Role[] = ["OWNER"];

/** resource -> role -> allowed actions. Omit an action to deny it. */
const PERMISSION_MAP: Record<Resource, Partial<Record<Role, Action[]>>> = {
  "dashboard.owner": { OWNER: ["view"] },
  "dashboard.manager": { OWNER: ["view"], MANAGER: ["view"] },
  "dashboard.sales": { OWNER: ["view"], MANAGER: ["view"], SALES: ["view"] },
  "dashboard.stylist": { OWNER: ["view"], MANAGER: ["view"], STYLIST: ["view"] },
  "dashboard.tailor": { OWNER: ["view"], MANAGER: ["view"], TAILOR: ["view"] },
  "dashboard.cleaner": { OWNER: ["view"], MANAGER: ["view"], CLEANER: ["view"] },
  "dashboard.delivery": { OWNER: ["view"], MANAGER: ["view"], DELIVERY: ["view"] },
  "dashboard.customer": { CUSTOMER: ["view"] },

  customers: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    SALES: ["view", "create", "update"],
    STYLIST: ["view", "update"],
  },
  garments: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    SALES: ["view"],
    STYLIST: ["view"],
    TAILOR: ["view"],
    CLEANER: ["view"],
  },
  bookings: {
    OWNER: ["view", "create", "update", "delete", "approve"],
    MANAGER: ["view", "create", "update", "delete", "approve"],
    SALES: ["view", "create", "update"],
    STYLIST: ["view"],
  },
  appointments: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    SALES: ["view", "create", "update"],
    STYLIST: ["view", "create", "update"],
  },
  calendar: {
    OWNER: ["view"],
    MANAGER: ["view"],
    SALES: ["view"],
    STYLIST: ["view"],
  },
  tailoring: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    TAILOR: ["view", "update"],
  },
  cleaning: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    CLEANER: ["view", "update"],
  },
  delivery: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    DELIVERY: ["view", "update"],
  },
  payments: {
    OWNER: ["view", "create", "update", "approve"],
    MANAGER: ["view", "create", "update", "approve"],
    SALES: ["view", "create"],
  },
  reports: {
    OWNER: ["view"],
    MANAGER: ["view"],
  },
  staff: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "update"],
  },
  branches: {
    OWNER: ["view", "create", "update", "delete"],
  },
  settings: {
    OWNER: ["view", "update"],
  },
  auditLog: {
    OWNER: ["view"],
  },
  conditionReports: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    SALES: ["view"],
    STYLIST: ["view"],
    TAILOR: ["view"],
  },
  packages: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
    SALES: ["view"],
  },
  suppliers: {
    OWNER: ["view", "create", "update", "delete"],
    MANAGER: ["view", "create", "update", "delete"],
  },
  documents: {
    OWNER: ["view", "create", "delete"],
    MANAGER: ["view", "create", "delete"],
    SALES: ["view", "create"],
    STYLIST: ["view"],
    TAILOR: ["view"],
    CLEANER: ["view"],
    DELIVERY: ["view"],
  },
  transfers: {
    OWNER: ["view", "create", "update", "approve"],
    MANAGER: ["view", "create"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  if (FULL_ACCESS.includes(role)) {
    // Owner sees everything, but respect resources that are genuinely
    // role-scoped dashboards not meant for switching into (still allowed to view).
    return true;
  }
  const allowed = PERMISSION_MAP[resource]?.[role];
  return Boolean(allowed?.includes(action));
}

/**
 * Throws — for the small set of void-returning mutation actions
 * (status-change actions like updateTailoringStatus) whose callers already
 * wrap the call in try/catch and toast the error. For any action that
 * returns `ActionState` (the `{error}` pattern used by every create/update
 * form), use `permissionError` instead — throwing there produces an
 * uncaught server-action crash (a 500) rather than a friendly inline error.
 */
export function requireCan(role: Role, resource: Resource, action: Action): void {
  if (!can(role, resource, action)) {
    throw new Error(`Forbidden: role ${role} cannot ${action} ${resource}`);
  }
}

/** Same check as `requireCan`, but returns a user-facing message instead of
 * throwing — use this in every action that returns `ActionState`. */
export function permissionError(role: Role, resource: Resource, action: Action): string | null {
  if (can(role, resource, action)) return null;
  return `You don't have permission to ${action} ${resource}.`;
}

/** Where a role lands after login. */
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/dashboard/owner";
    case "MANAGER":
      return "/dashboard/manager";
    case "SALES":
      return "/dashboard/sales";
    case "STYLIST":
      return "/dashboard/stylist";
    case "TAILOR":
      return "/portal/tailor";
    case "CLEANER":
      return "/portal/cleaner";
    case "DELIVERY":
      return "/portal/delivery";
    case "CUSTOMER":
      return "/portal/customer";
    default:
      return "/login";
  }
}
