import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { getTenantAction, updateTenantAction } from "../update-tenant.action";
import type { PlatformTenant } from "@/lib/endatix-api/platform-tenants/types";

const { getByIdMock, updateMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../../require-platform-admin/require-platform-admin.server", () => ({
  requirePlatformAdmin: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    platformTenants = { getById: getByIdMock, update: updateMock };
  },
}));

const TENANT: PlatformTenant = {
  id: "42",
  name: "Acme",
  shortUrl: "xk9mp2qr",
  description: null,
  allowSelfRegistration: true,
  allowedAuthProviderKeys: [],
  defaultRegistrationRoleName: "Creator",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("update-tenant actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads a tenant by id", async () => {
    getByIdMock.mockResolvedValue(ApiResult.success(TENANT));

    const result = await getTenantAction("42");

    expect(Result.isSuccess(result)).toBe(true);
    expect(getByIdMock).toHaveBeenCalledWith("42");
  });

  it("updates a tenant and revalidates the admin list", async () => {
    updateMock.mockResolvedValue(
      ApiResult.success({ ...TENANT, allowSelfRegistration: false }),
    );

    const result = await updateTenantAction("42", {
      allowSelfRegistration: false,
    });

    expect(Result.isSuccess(result)).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/(main)/admin/tenants");
  });

  it("does not revalidate when update fails", async () => {
    updateMock.mockResolvedValue(ApiResult.notFoundError("Missing"));

    const result = await updateTenantAction("42", { name: "Nope" });

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
