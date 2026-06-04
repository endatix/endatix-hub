import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { deleteUserAction } from "../delete-user/delete-user.action";

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

describe("deleteUserAction", () => {
  const requirePermission = vi.fn();
  const listUsers = vi.fn();
  const removeAccess = vi.fn();
  const targetUserId = "123";
  const actorUserId = "456";
  const targetEmail = "target@endatix.com";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
      user: { id: actorUserId },
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        users: {
          list: listUsers,
          removeAccess,
        },
      } as never;
    });
    requirePermission.mockResolvedValue(undefined);
    listUsers.mockResolvedValue(
      ApiResult.success({
        items: [
          {
            id: Number(targetUserId),
            userName: targetEmail,
            email: targetEmail,
            isVerified: true,
            roles: [],
          },
        ],
        page: 1,
        pageSize: 25,
        totalPages: 1,
        totalRecords: 1,
      }),
    );
    removeAccess.mockResolvedValue(
      ApiResult.success({ success: true, message: "Removed" }),
    );
  });

  it("requires typed email confirmation before removing access", async () => {
    const result = await deleteUserAction(
      { isSuccess: undefined },
      { userId: targetUserId },
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errors?.confirmationEmail).toBeDefined();
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("rejects self-removal before calling removeAccess", async () => {
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
      user: { id: targetUserId },
    } as never);

    const result = await deleteUserAction(
      { isSuccess: undefined },
      {
        userId: targetUserId,
        confirmationEmail: targetEmail,
      },
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toEqual([
      "You cannot remove your own organization access.",
    ]);
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("rejects mismatched confirmation before calling removeAccess", async () => {
    listUsers.mockResolvedValueOnce(
      ApiResult.success({
        items: [],
        page: 1,
        pageSize: 25,
        totalPages: 0,
        totalRecords: 0,
      }),
    );

    const result = await deleteUserAction(
      { isSuccess: undefined },
      {
        userId: targetUserId,
        confirmationEmail: "other@endatix.com",
      },
    );

    expect(result.isSuccess).toBe(false);
    expect(result.formErrors).toEqual([
      "Type the user's email address to confirm.",
    ]);
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("removes access after confirmation and self-removal checks pass", async () => {
    const result = await deleteUserAction(
      { isSuccess: undefined },
      {
        userId: targetUserId,
        confirmationEmail: targetEmail,
      },
    );

    expect(requirePermission).toHaveBeenCalledWith(
      Permissions.Tenant.ManageUsers,
    );
    expect(listUsers).toHaveBeenCalledWith({
      search: targetEmail,
      page: 1,
      pageSize: 25,
    });
    expect(removeAccess).toHaveBeenCalledWith(targetUserId);
    expect(revalidatePath).toHaveBeenCalledWith("/settings/organization/users");
    expect(result.isSuccess).toBe(true);
  });
});
