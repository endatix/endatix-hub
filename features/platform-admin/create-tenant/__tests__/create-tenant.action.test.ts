import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { createTenantAction } from "../create-tenant.action";
import type { PlatformTenant } from "@/lib/endatix-api/platform-tenants/types";

const { createMock, tenantManagementFlagMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  tenantManagementFlagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock(
  "@/features/platform-admin/require-platform-admin/require-platform-admin.server",
  () => ({
    requirePlatformAdmin: vi.fn().mockResolvedValue({ accessToken: "token" }),
  }),
);

vi.mock("@/lib/feature-flags/flags", () => ({
  tenantManagementFlag: tenantManagementFlagMock,
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    platformTenants = { create: createMock };
  },
}));

const TENANT: PlatformTenant = {
  id: "1",
  name: "Acme",
  shortUrl: "xk9mp2qr",
  description: null,
  allowSelfRegistration: false,
  allowedAuthProviderKeys: [],
  defaultRegistrationRoleName: "Respondent",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("createTenantAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantManagementFlagMock.mockResolvedValue(true);
  });

  it("rejects a blank name without calling the API", async () => {
    const result = await createTenantAction({
      name: "  ",
      allowSelfRegistration: false,
    });

    expect(Result.isError(result)).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("stays dark when the multi-tenancy flag is off", async () => {
    tenantManagementFlagMock.mockResolvedValue(false);

    const result = await createTenantAction({
      name: "Acme",
      allowSelfRegistration: false,
    });

    expect(Result.isError(result)).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a tenant and revalidates the admin list", async () => {
    createMock.mockResolvedValue(ApiResult.success(TENANT));

    const result = await createTenantAction({
      name: " Acme ",
      description: "  ",
      allowSelfRegistration: true,
      defaultRegistrationRoleName: "Respondent",
    });

    expect(Result.isSuccess(result)).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      name: "Acme",
      description: null,
      allowSelfRegistration: true,
      defaultRegistrationRoleName: "Respondent",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/(main)/admin/tenants");
  });

  it("does not revalidate when the API fails", async () => {
    createMock.mockResolvedValue(ApiResult.validationError("Name is taken"));

    const result = await createTenantAction({
      name: "Acme",
      allowSelfRegistration: false,
    });

    expect(Result.isError(result)).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
