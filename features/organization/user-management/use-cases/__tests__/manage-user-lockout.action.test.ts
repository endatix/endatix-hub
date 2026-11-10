import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import {
  authorization,
  invalidateUserAuthorizationCache,
} from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  lockoutUserAction,
  unlockUserAction,
} from "../manage-user-lockout/manage-user-lockout.action";

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

describe("user lockout actions", () => {
  const userId = "1507347517849731072";
  const lockout = vi.fn();
  const unlock = vi.fn();
  const requirePermission = vi.fn();

  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { users: { lockout, unlock } } as never;
    });
    requirePermission.mockResolvedValue(undefined);
    lockout.mockResolvedValue(ApiResult.success({ message: "Locked" }));
    unlock.mockResolvedValue(ApiResult.success({ message: "Unlocked" }));
  });

  it("clears the user's cached permissions after a lockout", async () => {
    const result = await lockoutUserAction(
      { isSuccess: undefined },
      { userId },
    );

    expect(result.isSuccess).toBe(true);
    expect(invalidateUserAuthorizationCache).toHaveBeenCalledWith({ userId });
  });

  it("clears the user's cached permissions after an unlock", async () => {
    await unlockUserAction({ isSuccess: undefined }, { userId });

    expect(invalidateUserAuthorizationCache).toHaveBeenCalledWith({ userId });
  });

  it("keeps cached permissions when the lockout fails", async () => {
    lockout.mockResolvedValue(ApiResult.serverError("Could not lock out"));

    await lockoutUserAction({ isSuccess: undefined }, { userId });

    expect(invalidateUserAuthorizationCache).not.toHaveBeenCalled();
  });
});
