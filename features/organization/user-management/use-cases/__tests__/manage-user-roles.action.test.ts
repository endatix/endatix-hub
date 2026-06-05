import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { SystemRoles } from "@/features/auth/authorization/domain/system-roles";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { setUserRoleAction } from "../manage-user-roles/manage-user-roles.action";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/authorization")>();

  return {
    ...actual,
    authorization: vi.fn(),
  };
});

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();

  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

describe("manage user roles action", () => {
  const replaceRoles = vi.fn();
  const requirePermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        users: {
          replaceRoles,
        },
      } as never;
    });
    requirePermission.mockResolvedValue(undefined);
  });

  it("replaces user roles in a single API call", async () => {
    const userId = "1507347517849731072";
    replaceRoles.mockResolvedValue(ApiResult.success({ message: "ok" }));

    const result = await setUserRoleAction(
      { isSuccess: undefined },
      {
        userId,
        roles: ["Creator", "Reviewer"],
      },
    );

    expect(requirePermission).toHaveBeenCalledWith(
      Permissions.Tenant.ManageRoles,
    );
    expect(replaceRoles).toHaveBeenCalledWith(userId, {
      roleNames: ["Creator", "Reviewer"],
    });
    expect(result.isSuccess).toBe(true);
  });

  it("returns API errors from replace roles", async () => {
    const userId = "1507347517849731072";
    replaceRoles.mockResolvedValue(ApiResult.serverError("Could not update roles"));

    const result = await setUserRoleAction(
      { isSuccess: undefined },
      {
        userId,
        roles: ["Creator"],
      },
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toEqual(["Could not update roles"]);
  });

  it("allows tenant Admin role assignment for existing users", async () => {
    const userId = "1507347517849731072";
    replaceRoles.mockResolvedValue(ApiResult.success({ message: "ok" }));

    const result = await setUserRoleAction(
      { isSuccess: undefined },
      {
        userId,
        roles: [SystemRoles.Admin],
      },
    );

    expect(result.isSuccess).toBe(true);
    expect(replaceRoles).toHaveBeenCalledWith(userId, {
      roleNames: [SystemRoles.Admin],
    });
  });

  it("rejects PlatformAdmin role assignment before calling the API", async () => {
    const userId = "1507347517849731072";

    const result = await setUserRoleAction(
      { isSuccess: undefined },
      {
        userId,
        roles: [SystemRoles.PlatformAdmin],
      },
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toEqual([
      "Platform administrator roles are managed at the platform level.",
    ]);
    expect(replaceRoles).not.toHaveBeenCalled();
  });
});
