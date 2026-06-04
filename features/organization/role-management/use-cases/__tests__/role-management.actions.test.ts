import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "../role-management.actions";

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

describe("role management actions", () => {
  const createRole = vi.fn();
  const deleteRole = vi.fn();
  const updateRole = vi.fn();
  const requirePermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requirePermission,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        roles: {
          create: createRole,
          delete: deleteRole,
          update: updateRole,
        },
      } as never;
    });
    requirePermission.mockResolvedValue(undefined);
    createRole.mockResolvedValue(ApiResult.success({ message: "created" }));
    deleteRole.mockResolvedValue(ApiResult.success({ message: "deleted" }));
    updateRole.mockResolvedValue(ApiResult.success({ message: "updated" }));
  });

  it("filters non-string permission values when creating a role", async () => {
    const formData = new FormData();
    formData.set("name", "Reviewer");
    formData.set("description", new File(["ignored"], "description.txt"));
    formData.append("permissions", "forms.view");
    formData.append("permissions", new File(["ignored"], "permission.txt"));

    const result = await createRoleAction({ isSuccess: undefined }, formData);

    expect(requirePermission).toHaveBeenCalledWith(
      Permissions.Tenant.ManageRoles,
    );
    expect(createRole).toHaveBeenCalledWith({
      name: "Reviewer",
      description: "",
      permissions: ["forms.view"],
    });
    expect(result.isSuccess).toBe(true);
  });

  it("uses a safe fallback when delete role name is not a string", async () => {
    const formData = new FormData();
    formData.set("roleName", new File(["ignored"], "role.txt"));

    const result = await deleteRoleAction({ isSuccess: undefined }, formData);

    expect(result.isSuccess).toBe(false);
    expect(result.data?.roleName).toBe("");
    expect(deleteRole).not.toHaveBeenCalled();
  });

  it("filters non-string permission values when updating a role", async () => {
    const formData = new FormData();
    formData.set("roleName", "Reviewer");
    formData.set("description", "Can review forms");
    formData.append("permissions", "forms.view");
    formData.append("permissions", new File(["ignored"], "permission.txt"));

    const result = await updateRoleAction({ isSuccess: undefined }, formData);

    expect(updateRole).toHaveBeenCalledWith("Reviewer", {
      description: "Can review forms",
      permissions: ["forms.view"],
    });
    expect(result.isSuccess).toBe(true);
  });
});
