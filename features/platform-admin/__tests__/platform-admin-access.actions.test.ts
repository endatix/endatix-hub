import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { grantPlatformAdminAction } from "../grant-platform-admin/grant-platform-admin.action";
import { revokePlatformAdminAction } from "../revoke-platform-admin/revoke-platform-admin.action";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../server", () => ({
  requirePlatformAdmin: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/auth/authorization")>();
  return {
    ...actual,
    invalidateUserAuthorizationCache: vi.fn(),
  };
});

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  return {
    ...actual,
    EndatixApi: vi.fn(),
  };
});

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn(), warn: vi.fn() },
}));

describe("platform admin access actions", () => {
  const userId = "1507347517849731072";
  const grant = vi.fn();
  const revoke = vi.fn();

  beforeEach(() => {
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { platformAdmins: { grant, revoke } } as never;
    });
    grant.mockResolvedValue(ApiResult.success({ message: "Granted" }));
    revoke.mockResolvedValue(ApiResult.success({ message: "Revoked" }));
  });

  it("clears cached permissions after granting platform admin", async () => {
    await grantPlatformAdminAction(userId);

    expect(invalidateUserAuthorizationCache).toHaveBeenCalledWith({
      allUsers: true,
    });
  });

  it("clears cached permissions after revoking platform admin", async () => {
    await revokePlatformAdminAction(userId);

    expect(invalidateUserAuthorizationCache).toHaveBeenCalledWith({
      allUsers: true,
    });
  });

  it("keeps cached permissions when the grant fails", async () => {
    grant.mockResolvedValue(ApiResult.serverError("Could not grant"));

    await grantPlatformAdminAction(userId);

    expect(invalidateUserAuthorizationCache).not.toHaveBeenCalled();
  });

  it("keeps cached permissions when the revoke fails", async () => {
    revoke.mockResolvedValue(ApiResult.serverError("Could not revoke"));

    await revokePlatformAdminAction(userId);

    expect(invalidateUserAuthorizationCache).not.toHaveBeenCalled();
  });
});
