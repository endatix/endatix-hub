import { redirect } from "next/navigation";
import { checkPermission, checkForPermissions } from "./check-permission";
import { Permissions as AppPermissions } from "../domain/permissions";
import {
  DEFAULT_PERMISSION_ERROR_MESSAGE,
  isAuthenticationRequired,
  isPermissionDenied,
  PermissionError,
} from "../domain/permission-result";
import { FORBIDDEN_PATH, SIGNIN_PATH } from "../infrastructure";

/**
 * Require a specific permission - throws forbidden() if user doesn't have it
 * @param permission - The permission to require
 * @throws Calls forbidden() if permission is missing
 */
async function requirePermission(permission: string): Promise<void> {
  const result = await checkPermission(permission);

  if (!result.success) {
    handlePermissionError(result);
  }
}

/**
 * Require any of the specified permissions - throws forbidden() if user has none
 * @param permissions - Array of permissions to check
 * @throws Calls forbidden() if user has none of the permissions
 */
async function requireAnyPermission(permissions: string[]): Promise<void> {
  const result = await checkForPermissions(permissions, "any");

  if (!result.success) {
    handlePermissionError(result);
  }
}

/**
 * Require all of the specified permissions - throws forbidden() if user is missing any
 * @param permissions - Array of permissions to check
 * @throws Calls forbidden() if user is missing any of the permissions
 */
async function requireAllPermissions(permissions: string[]): Promise<void> {
  const result = await checkForPermissions(permissions, "all");

  if (!result.success) {
    handlePermissionError(result);
  }
}

async function requireHubAccess() {
  await requirePermission(AppPermissions.Apps.HubAccess);
}

async function requireAdminAccess() {
  await requirePermission(AppPermissions.Admin.All);
}

function handlePermissionError(permissionError: PermissionError): never {
  if (!permissionError) {
    throw new Error(DEFAULT_PERMISSION_ERROR_MESSAGE);
  }

  if (isPermissionDenied(permissionError)) {
    return redirect(FORBIDDEN_PATH);
  }

  if (isAuthenticationRequired(permissionError)) {
    return redirect(SIGNIN_PATH);
  }

  throw new Error(
    permissionError.error?.message || DEFAULT_PERMISSION_ERROR_MESSAGE,
  );
}

export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireHubAccess,
  requireAdminAccess,
};
