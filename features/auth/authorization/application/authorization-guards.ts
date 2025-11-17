import { AuthCheckResult } from "../domain/authorization-result";
import { Permissions } from "../domain/permissions";
import { handlePermissionError } from "./error-handler";
import { SystemRoles } from "../domain/system-roles";

export function requirePermissionFactory(
  checkPermission: (permission: string) => Promise<AuthCheckResult>,
) {
  return async (permission: string): Promise<void> => {
    const result = await checkPermission(permission);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAnyPermissionFactory(
  checkAnyPermission: (permissions: string[]) => Promise<AuthCheckResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAnyPermission(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAllPermissionsFactory(
  checkAllPermissions: (permissions: string[]) => Promise<AuthCheckResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAllPermissions(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireHubAccessFactory(
  checkPermission: (permission: string) => Promise<AuthCheckResult>,
) {
  return async (): Promise<void> => {
    const result = await checkPermission(Permissions.Apps.HubAccess);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAdminAccessFactory(
  checkIsAdmin: () => Promise<AuthCheckResult>,
) {
  return async (): Promise<void> => {
    const result = await checkIsAdmin();
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireRoleFactory(
  checkIsInRole: (role: string) => Promise<AuthCheckResult>,
) {
  return async (role: string): Promise<void> => {
    const result = await checkIsInRole(role);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requirePlatformAdminFactory(
  checkIsInRole: (role: string) => Promise<AuthCheckResult>,
) {
  return async (): Promise<void> => {
    const result = await checkIsInRole(SystemRoles.PlatformAdmin);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}
