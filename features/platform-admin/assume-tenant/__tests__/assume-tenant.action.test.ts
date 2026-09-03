import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { assumeTenantAction, exitAssumeAction } from "../assume-tenant.action";

const { assumeMock, exitMock, tenantManagementFlagMock, replaceMock } =
  vi.hoisted(() => ({
    assumeMock: vi.fn(),
    exitMock: vi.fn(),
    tenantManagementFlagMock: vi.fn(),
    replaceMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
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
    auth = { assumeTenant: assumeMock, exitAssume: exitMock };
  },
}));

vi.mock("../replace-session-tokens", () => ({
  replaceSessionTokens: replaceMock,
}));

const TOKENS = { accessToken: "access", refreshToken: "refresh" };

describe("assume-tenant actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantManagementFlagMock.mockResolvedValue(true);
    replaceMock.mockResolvedValue(Result.success(true));
  });

  it("rejects a non-numeric tenant id without calling the API", async () => {
    const result = await assumeTenantAction("acme");

    expect(Result.isError(result)).toBe(true);
    expect(assumeMock).not.toHaveBeenCalled();
  });

  it("stays dark when the multi-tenancy flag is off", async () => {
    tenantManagementFlagMock.mockResolvedValue(false);

    const result = await assumeTenantAction("42");

    expect(Result.isError(result)).toBe(true);
    expect(assumeMock).not.toHaveBeenCalled();
  });

  it("swaps tokens and redirects into /forms", async () => {
    assumeMock.mockResolvedValue(ApiResult.success(TOKENS));

    await expect(assumeTenantAction("42")).rejects.toThrow("REDIRECT:/forms");
    expect(assumeMock).toHaveBeenCalledWith({ tenantId: "42" });
    expect(replaceMock).toHaveBeenCalledWith("access", "refresh");
    expect(redirect).toHaveBeenCalledWith("/forms");
  });

  it("returns the API error without swapping tokens", async () => {
    assumeMock.mockResolvedValue(
      ApiResult.forbiddenError("Cannot assume this tenant"),
    );

    const result = await assumeTenantAction("42");

    expect(Result.isError(result)).toBe(true);
    expect(replaceMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("exits back to the tenants list", async () => {
    exitMock.mockResolvedValue(ApiResult.success(TOKENS));

    await expect(exitAssumeAction()).rejects.toThrow("REDIRECT:/admin/tenants");
    expect(replaceMock).toHaveBeenCalledWith("access", "refresh");
    expect(redirect).toHaveBeenCalledWith("/admin/tenants");
  });
});
