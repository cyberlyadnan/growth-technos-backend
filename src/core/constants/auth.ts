import { UserRole, PANEL_STAFF_ROLES } from './roles';

/**
 * Roles that currently have full admin panel access.
 * Extend this list when new roles are introduced — no middleware refactor needed.
 */
export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isPanelStaffRole(role: string): boolean {
  return PANEL_STAFF_ROLES.includes(role as UserRole);
}

export function isMarketingRole(role: string): boolean {
  return role === UserRole.MARKETING;
}
