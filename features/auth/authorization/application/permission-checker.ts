import {
  AuthCheckResult,
  AuthorizationResult,
  GetAuthDataResult,
} from "../domain/authorization-result";

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
      console.error("Unexpected error during checking permission:", error);
      return AuthorizationResult.error();
    }
  };
}

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
      console.error("Unexpected error during checking permissions:", error);
      return AuthorizationResult.error();
    }
  };
}

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
      console.error("Unexpected error during checking permissions:", error);
      return AuthorizationResult.error();
    }
  };
}
