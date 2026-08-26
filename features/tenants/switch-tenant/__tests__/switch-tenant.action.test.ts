import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import type { IAuthorizationService } from "@/features/auth/authorization/domain/authorization-service";
import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/features/platform-admin/assume-tenant/assume-tenant.action", () => ({
  assumeTenantAction: vi.fn(),
}));

vi.mock("@/features/platform-admin/assume-tenant/replace-session-tokens", () => ({
  replaceSessionTokens: vi.fn(),
}));

vi.mock("@/features/platform-admin/assume-tenant/read-assume-session", () => ({
  readAssumeSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const listMyTenants = vi.fn();
const switchTenant = vi.fn();
const listPlatformTenants = vi.fn();

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  class MockEndatixApi {
    auth = {
      listMyTenants,
      switchTenant,
    };
    platformTenants = {
      list: listPlatformTenants,
    };
  }
  return {
    ...actual,
    EndatixApi: MockEndatixApi,
  };
});

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { assumeTenantAction } from "@/features/platform-admin/assume-tenant/assume-tenant.action";
import { readAssumeSession } from "@/features/platform-admin/assume-tenant/read-assume-session";
import {
  listMyTenantsAction,
  selectSwitcherTenantAction,
} from "../switch-tenant.action";

const session: Session = {
  expires: "2026-01-01T00:00:00.000Z",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 1735689600,
  user: { id: "user-1", email: "tech@endatix.com" },
};

function authService(roles: string[], tenantId = "1"): IAuthorizationService {
  return {
    getAuthorizationData: vi.fn().mockResolvedValue(
      AuthorizationResult.success({
        userId: "user-1",
        tenantId,
        roles,
        permissions: [],
        isAdmin: false,
        cachedAt: "2026-01-01T00:00:00Z",
        expiresAt: "2026-01-01T12:00:00Z",
        eTag: "etag",
      }),
    ),
  } as unknown as IAuthorizationService;
}

describe("listMyTenantsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(session);
    vi.mocked(authorization).mockResolvedValue(authService([]));
  });

  it("returns memberships for a regular user", async () => {
    listMyTenants.mockResolvedValue(
      ApiResult.success({
        items: [
          { id: "1", name: "Acme", slug: "acme", isActive: true },
        ],
      }),
    );

    const result = await listMyTenantsAction();

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([
        {
          id: "1",
          name: "Acme",
          slug: "acme",
          isActive: true,
          isMembership: true,
        },
      ]);
    }
    expect(listPlatformTenants).not.toHaveBeenCalled();
  });

  it("merges the platform tenant directory for platform admins", async () => {
    vi.mocked(authorization).mockResolvedValue(
      authService([SystemRoles.PlatformAdmin], "1"),
    );
    listMyTenants.mockResolvedValue(
      ApiResult.success({
        items: [{ id: "1", name: "Acme", slug: "acme", isActive: true }],
      }),
    );
    listPlatformTenants.mockResolvedValue(
      ApiResult.success({
        items: [
          { id: "1", name: "Acme", slug: "acme" },
          { id: "3", name: "Gamma", slug: "gamma" },
        ],
        totalRecords: 2,
        page: 1,
        pageSize: 100,
      }),
    );

    const result = await listMyTenantsAction();

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([
        {
          id: "1",
          name: "Acme",
          slug: "acme",
          isActive: true,
          isMembership: true,
        },
        {
          id: "3",
          name: "Gamma",
          slug: "gamma",
          isActive: false,
          isMembership: false,
        },
      ]);
    }
  });
});

describe("selectSwitcherTenantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(session);
    vi.mocked(readAssumeSession).mockReturnValue(null);
  });

  it("assumes a directory tenant the user does not belong to", async () => {
    listMyTenants.mockResolvedValue(
      ApiResult.success({
        items: [{ id: "1", name: "Acme", slug: "acme", isActive: true }],
      }),
    );
    vi.mocked(assumeTenantAction).mockResolvedValue(undefined as never);

    await selectSwitcherTenantAction("3");

    expect(assumeTenantAction).toHaveBeenCalledWith("3");
    expect(switchTenant).not.toHaveBeenCalled();
  });
});
