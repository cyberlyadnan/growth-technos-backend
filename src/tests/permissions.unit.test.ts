import {
  DEFAULT_ROLE_PERMISSIONS,
  MARKETING_PERMISSIONS,
  Permission,
  resolveRolePermissions,
  UserRole,
} from '@core/constants';

describe('resolveRolePermissions', () => {
  it('gives marketing only the explicit allowlist', () => {
    const perms = resolveRolePermissions(UserRole.MARKETING);
    expect(perms).toEqual(expect.arrayContaining(MARKETING_PERMISSIONS.map(String)));
    expect(perms).not.toContain(Permission.AGENCY_READ);
    expect(perms).not.toContain(Permission.CLIENTS_CREATE);
    expect(perms).not.toContain(Permission.USERS_CREATE);
    expect(perms).not.toContain(Permission.MEDIA_DELETE);
    expect(perms).not.toContain(Permission.CONTENT_PERMANENT_DELETE);
    expect(perms).toContain(Permission.CONTENT_PUBLISH);
    expect(perms).toContain(Permission.LEADS_UPDATE);
    expect(perms).toContain(Permission.ANALYTICS_READ);
  });

  it('ignores privilege-expanding explicit permissions for marketing', () => {
    const perms = resolveRolePermissions(UserRole.MARKETING, [
      Permission.CONTENT_READ,
      Permission.AGENCY_READ,
      Permission.USERS_CREATE,
    ]);
    expect(perms).toContain(Permission.CONTENT_READ);
    expect(perms).not.toContain(Permission.AGENCY_READ);
    expect(perms).not.toContain(Permission.USERS_CREATE);
  });

  it('keeps full admin permissions', () => {
    const perms = resolveRolePermissions(UserRole.ADMIN);
    expect(perms).toEqual(expect.arrayContaining(Object.values(Permission)));
    expect(perms.length).toBe(DEFAULT_ROLE_PERMISSIONS[UserRole.ADMIN].length);
  });
});
