import { UserRole } from './roles';

/**
 * Roles that currently have full admin panel access.
 * Extend this list when new roles are introduced — no middleware refactor needed.
 */
export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}
