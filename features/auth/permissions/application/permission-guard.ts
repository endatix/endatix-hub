import { AuthorizationResult } from "../domain/authorization-result";
import { Permissions } from "..";
import { handlePermissionError } from "./error-handler";

export function requirePermissionFactory(
  checkPermission: (permission: string) => Promise<AuthorizationResult>,
) {
  return async (permission: string): Promise<void> => {
    const result = await checkPermission(permission);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAnyPermissionFactory(
  checkAnyPermission: (permissions: string[]) => Promise<AuthorizationResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAnyPermission(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAllPermissionsFactory(
  checkAllPermissions: (permissions: string[]) => Promise<AuthorizationResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAllPermissions(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireHubAccessFactory(
  checkPermission: (permission: string) => Promise<AuthorizationResult>,
) {
  return async (): Promise<void> => {
    const result = await checkPermission(Permissions.Apps.HubAccess);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAdminAccessFactory(
  checkPermission: (permission: string) => Promise<AuthorizationResult>,
) {
  return async (): Promise<void> => {
    const result = await checkPermission(Permissions.Apps.SaaSAdminAccess);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}
