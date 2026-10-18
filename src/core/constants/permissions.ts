export enum Permission {
  // Users
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // Roles
  ROLES_READ = 'roles:read',
  ROLES_MANAGE = 'roles:manage',

  // CMS
  CONTENT_READ = 'content:read',
  CONTENT_CREATE = 'content:create',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  CONTENT_PUBLISH = 'content:publish',
  /** Hard/permanent content deletion — administrators only by default. */
  CONTENT_PERMANENT_DELETE = 'content:permanent_delete',

  // CRM
  LEADS_READ = 'leads:read',
  LEADS_CREATE = 'leads:create',
  LEADS_UPDATE = 'leads:update',
  LEADS_DELETE = 'leads:delete',
  LEADS_ASSIGN = 'leads:assign',

  // Contacts / newsletter (reserved for dedicated CRM modules when wired)
  CONTACTS_READ = 'contacts:read',
  CONTACTS_UPDATE = 'contacts:update',
  NEWSLETTER_READ = 'newsletter:read',
  NEWSLETTER_UPDATE = 'newsletter:update',

  // Media
  MEDIA_READ = 'media:read',
  MEDIA_UPLOAD = 'media:upload',
  MEDIA_DELETE = 'media:delete',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_MANAGE = 'settings:manage',

  // Analytics
  ANALYTICS_READ = 'analytics:read',

  // Agency Management System (AMS)
  AGENCY_READ = 'agency:read',
  CLIENTS_READ = 'clients:read',
  CLIENTS_CREATE = 'clients:create',
  CLIENTS_UPDATE = 'clients:update',
  CLIENTS_DELETE = 'clients:delete',
  PROJECTS_READ = 'projects:read',
  PROJECTS_CREATE = 'projects:create',
  PROJECTS_UPDATE = 'projects:update',
  PROJECTS_DELETE = 'projects:delete',
  QUOTATIONS_READ = 'quotations:read',
  QUOTATIONS_CREATE = 'quotations:create',
  QUOTATIONS_UPDATE = 'quotations:update',
  QUOTATIONS_DELETE = 'quotations:delete',
  INVOICES_READ = 'invoices:read',
  INVOICES_CREATE = 'invoices:create',
  INVOICES_UPDATE = 'invoices:update',
  INVOICES_DELETE = 'invoices:delete',
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_CREATE = 'payments:create',
  PAYMENTS_UPDATE = 'payments:update',
  PAYMENTS_DELETE = 'payments:delete',
  EXPENSES_READ = 'expenses:read',
  EXPENSES_CREATE = 'expenses:create',
  EXPENSES_UPDATE = 'expenses:update',
  EXPENSES_DELETE = 'expenses:delete',
  ASSETS_READ = 'assets:read',
  ASSETS_CREATE = 'assets:create',
  ASSETS_UPDATE = 'assets:update',
  ASSETS_DELETE = 'assets:delete',
  ASSETS_REVEAL = 'assets:reveal',
  DOCUMENTS_READ = 'documents:read',
  DOCUMENTS_CREATE = 'documents:create',
  DOCUMENTS_UPDATE = 'documents:update',
  DOCUMENTS_DELETE = 'documents:delete',
  MAINTENANCE_READ = 'maintenance:read',
  MAINTENANCE_CREATE = 'maintenance:create',
  MAINTENANCE_UPDATE = 'maintenance:update',
  MAINTENANCE_DELETE = 'maintenance:delete',
  REPORTS_READ = 'reports:read',
  AGENCY_SETTINGS_MANAGE = 'agency:settings:manage',

  // System
  SYSTEM_ADMIN = 'system:admin',
}

/** Explicit allowlist for Marketing Staff — no agency or user-admin permissions. */
export const MARKETING_PERMISSIONS: Permission[] = [
  Permission.CONTENT_READ,
  Permission.CONTENT_CREATE,
  Permission.CONTENT_UPDATE,
  Permission.CONTENT_DELETE,
  Permission.CONTENT_PUBLISH,
  Permission.MEDIA_READ,
  Permission.MEDIA_UPLOAD,
  Permission.LEADS_READ,
  Permission.LEADS_UPDATE,
  Permission.CONTACTS_READ,
  Permission.CONTACTS_UPDATE,
  Permission.NEWSLETTER_READ,
  Permission.NEWSLETTER_UPDATE,
  Permission.ANALYTICS_READ,
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.values(Permission),
  // All admins have full access today. Permissions remain on the user record for future RBAC.
  admin: Object.values(Permission),
  marketing: [...MARKETING_PERMISSIONS],
  editor: [
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.MEDIA_READ,
    Permission.MEDIA_UPLOAD,
    Permission.LEADS_READ,
  ],
  manager: [
    Permission.CONTENT_READ,
    Permission.LEADS_READ,
    Permission.LEADS_CREATE,
    Permission.LEADS_UPDATE,
    Permission.LEADS_ASSIGN,
    Permission.ANALYTICS_READ,
    Permission.MEDIA_READ,
    Permission.AGENCY_READ,
    Permission.CLIENTS_READ,
    Permission.CLIENTS_CREATE,
    Permission.CLIENTS_UPDATE,
    Permission.PROJECTS_READ,
    Permission.PROJECTS_CREATE,
    Permission.PROJECTS_UPDATE,
    Permission.QUOTATIONS_READ,
    Permission.QUOTATIONS_CREATE,
    Permission.QUOTATIONS_UPDATE,
    Permission.INVOICES_READ,
    Permission.INVOICES_CREATE,
    Permission.INVOICES_UPDATE,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_UPDATE,
    Permission.EXPENSES_READ,
    Permission.EXPENSES_CREATE,
    Permission.EXPENSES_UPDATE,
    Permission.EXPENSES_DELETE,
    Permission.DOCUMENTS_READ,
    Permission.DOCUMENTS_CREATE,
    Permission.DOCUMENTS_UPDATE,
    Permission.DOCUMENTS_DELETE,
    Permission.MAINTENANCE_READ,
    Permission.MAINTENANCE_CREATE,
    Permission.MAINTENANCE_UPDATE,
    Permission.MAINTENANCE_DELETE,
    Permission.ASSETS_READ,
    Permission.ASSETS_CREATE,
    Permission.ASSETS_UPDATE,
    Permission.ASSETS_DELETE,
    // ASSETS_REVEAL intentionally omitted for manager — admin/super_admin only by default
    Permission.REPORTS_READ,
  ],
  viewer: [
    Permission.CONTENT_READ,
    Permission.LEADS_READ,
    Permission.ANALYTICS_READ,
    Permission.AGENCY_READ,
    Permission.CLIENTS_READ,
    Permission.PROJECTS_READ,
    Permission.DOCUMENTS_READ,
    Permission.REPORTS_READ,
  ],
};

/**
 * Resolve effective permissions for a role.
 * Admin roles always receive the current full matrix (includes new AMS/CMS permissions as they grow).
 * Marketing and other roles use an explicit allowlist; non-empty DB overrides are only honored
 * for non-admin roles and are intersected with the role default to prevent privilege expansion.
 */
export function resolveRolePermissions(role: string, explicit?: string[]): string[] {
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];

  if (role === 'super_admin' || role === 'admin') {
    return defaults.map(String);
  }

  if (!explicit || explicit.length === 0) {
    return defaults.map(String);
  }

  const allowed = new Set(defaults.map(String));
  const filtered = explicit.filter((perm) => allowed.has(perm));
  return filtered.length > 0 ? filtered : defaults.map(String);
}
