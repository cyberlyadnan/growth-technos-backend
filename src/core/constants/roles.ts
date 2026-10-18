export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MARKETING = 'marketing',
  EDITOR = 'editor',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.MARKETING]: 50,
  [UserRole.EDITOR]: 40,
  [UserRole.VIEWER]: 20,
};

/**
 * Roles that may be assigned via the admin user-management API.
 * `super_admin` is never assignable through this path (seed/ops only).
 */
export const ASSIGNABLE_STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MARKETING];

/**
 * Roles visible and manageable in the admin staff directory.
 * Includes super_admin for listing existing operators; assignment of that role remains blocked.
 */
export const PANEL_STAFF_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MARKETING,
];
