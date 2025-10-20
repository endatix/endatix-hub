import { PermissionResult } from "../result/permission-result";
import { Permissions } from "..";
import { handlePermissionError } from "./error-handler";

export function requirePermissionFactory(
  checkPermission: (permission: string) => Promise<PermissionResult>,
) {
  return async (permission: string): Promise<void> => {
    const result = await checkPermission(permission);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAnyPermissionFactory(
  checkAnyPermission: (permissions: string[]) => Promise<PermissionResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAnyPermission(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAllPermissionsFactory(
  checkAllPermissions: (permissions: string[]) => Promise<PermissionResult>,
) {
  return async (permissions: string[]): Promise<void> => {
    const result = await checkAllPermissions(permissions);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireHubAccessFactory(
  checkPermission: (permission: string) => Promise<PermissionResult>,
) {
  return async (): Promise<void> => {
    const result = await checkPermission(Permissions.Apps.HubAccess);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}

export function requireAdminAccessFactory(
  checkPermission: (permission: string) => Promise<PermissionResult>,
) {
  return async (): Promise<void> => {
    const result = await checkPermission(Permissions.Admin.All);
    if (!result.success) {
      handlePermissionError(result);
    }
  };
}
