import { vi } from "vitest";
import type { AudienceAccess } from "../../require-audience-api.server";

type Checks = Omit<AudienceAccess, "api">;

const outcome = (success: boolean) => ({ success });

/**
 * The auth service's three checks over one set of grants, shaped like `AudienceAccess`.
 * `grant` replaces the set; each check reads it when called.
 */
export function grantedChecks() {
  let granted: string[] = [];
  const has = (permission: string) => granted.includes(permission);
  const mocks = {
    checkPermission: vi.fn(async (permission: string) =>
      outcome(has(permission)),
    ),
    checkAllPermissions: vi.fn(async (permissions: string[]) =>
      outcome(permissions.every((p) => has(p))),
    ),
    checkAnyPermission: vi.fn(async (permissions: string[]) =>
      outcome(permissions.some((p) => has(p))),
    ),
  };
  const checks = mocks as unknown as Checks;
  const grant = (...permissions: string[]) => {
    granted = permissions;
  };
  return { checks, grant };
}
