import {
  AuthCheckResult,
  AuthorizationResult,
  GetAuthDataResult,
} from "../domain/authorization-result";
import { TelemetryLogger } from "@/features/telemetry";

const LOGGER_NAME = "authorization";

/**
 * Checks if user has given permission.
 * @param permission - permission name
 * @returns Authorization result
 */
export function checkPermissionFactory(
  getUserAuthData: () => Promise<GetAuthDataResult>,
) {
  return async (permission: string): Promise<AuthCheckResult> => {
    try {
      const result = await getUserAuthData();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasPermission = result.data.permissions.includes(permission);
      return hasPermission
        ? AuthorizationResult.success()
        : AuthorizationResult.forbidden();
    } catch (error) {
      TelemetryLogger.error(
        "Unexpected error during permission check",
        error,
        { permission },
        LOGGER_NAME,
      );
      return AuthorizationResult.error();
    }
  };
}

/**
 * Checks if user has any of the given permissions.
 * @param permissions - permission names
 * @returns Authorization result
 */
export function checkAnyPermissionFactory(
  getUserAuthData: () => Promise<GetAuthDataResult>,
) {
  return async (permissions: string[]): Promise<AuthCheckResult> => {
    try {
      const result = await getUserAuthData();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasAny = permissions.some((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAny
        ? AuthorizationResult.success()
        : AuthorizationResult.forbidden();
    } catch (error) {
      TelemetryLogger.error(
        "Unexpected error during any-permission check",
        error,
        { permissionsCount: permissions.length },
        LOGGER_NAME,
      );
      return AuthorizationResult.error();
    }
  };
}

/**
 * Checks if user has all given permissions.
 * @param permissions - permission names
 * @returns Authorization result
 */
export function checkAllPermissionsFactory(
  getUserAuthData: () => Promise<GetAuthDataResult>,
) {
  return async (permissions: string[]): Promise<AuthCheckResult> => {
    try {
      const result = await getUserAuthData();

      if (!result.success) {
        return result;
      }

      if (result.data.isAdmin) {
        return AuthorizationResult.success();
      }

      const hasAll = permissions.every((permission) =>
        result.data.permissions.includes(permission),
      );

      return hasAll
        ? AuthorizationResult.success()
        : AuthorizationResult.forbidden();
    } catch (error) {
      TelemetryLogger.error(
        "Unexpected error during all-permissions check",
        error,
        { permissionsCount: permissions.length },
        LOGGER_NAME,
      );
      return AuthorizationResult.error();
    }
  };
}

/**
 * Checks if user is an admin.
 * @returns Authorization result
 */
export function checkIsAdminFactory(
  getUserAuthData: () => Promise<GetAuthDataResult>,
) {
  return async (): Promise<AuthCheckResult> => {
    const result = await getUserAuthData();
    if (!result.success) {
      return result;
    }
    return result.data.isAdmin
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden();
  };
}

/**
 * Checks if user is in given role.
 * @param role - role name
 * @returns Authorization result
 */
export function checkIsInRoleFactory(
  getUserAuthData: () => Promise<GetAuthDataResult>,
) {
  return async (role: string): Promise<AuthCheckResult> => {
    const result = await getUserAuthData();
    if (!result.success) {
      return result;
    }
    return result.data.roles.includes(role)
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden();
  };
}
