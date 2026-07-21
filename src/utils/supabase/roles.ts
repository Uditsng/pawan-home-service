export type UserRole = "admin" | "partner" | "customer";

/** Single source of truth for role → dashboard route mapping.
 *  Keep in sync with middleware role-gating logic. */
export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  partner: "/partner/dashboard",
  customer: "/customer/dashboard",
};

/** Resolve the dashboard route for a given role.
 *  Falls back to the customer dashboard for unknown/undefined roles. */
export function getDashboardForRole(role?: string | null): string {
  if (role === "admin" || role === "partner") {
    return ROLE_DASHBOARDS[role];
  }
  return ROLE_DASHBOARDS.customer;
}
