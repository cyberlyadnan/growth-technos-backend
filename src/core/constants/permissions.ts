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

  // CRM
  LEADS_READ = 'leads:read',
  LEADS_CREATE = 'leads:create',
  LEADS_UPDATE = 'leads:update',
  LEADS_DELETE = 'leads:delete',
  LEADS_ASSIGN = 'leads:assign',

  // Media
  MEDIA_READ = 'media:read',
  MEDIA_UPLOAD = 'media:upload',
  MEDIA_DELETE = 'media:delete',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_MANAGE = 'settings:manage',

  // Analytics
  ANALYTICS_READ = 'analytics:read',

  // System
  SYSTEM_ADMIN = 'system:admin',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.values(Permission),
  // All admins have full access today. Permissions remain on the user record for future RBAC.
  admin: Object.values(Permission),
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
  ],
  viewer: [Permission.CONTENT_READ, Permission.LEADS_READ, Permission.ANALYTICS_READ],
};
