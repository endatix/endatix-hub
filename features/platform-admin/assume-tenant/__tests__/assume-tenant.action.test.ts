import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { assumeTenantAction, exitAssumeAction } from "../assume-tenant.action";

const {
  assumeMock,
  exitMock,
  tenantManagementFlagMock,
  replaceMock,
  authMock,
} = vi.hoisted(() => ({
  assumeMock: vi.fn(),
  exitMock: vi.fn(),
  tenantManagementFlagMock: vi.fn(),
  replaceMock: vi.fn(),
  authMock: vi.fn(),
}));

function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.x`;
}

const ASSUMED_TOKEN = unsignedJwt({ sub: "7", tid: "99", act: "7" });

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
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
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
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
    authMock.mockResolvedValue({ accessToken: ASSUMED_TOKEN });
    exitMock.mockResolvedValue(ApiResult.success(TOKENS));

    await expect(exitAssumeAction()).rejects.toThrow("REDIRECT:/admin/tenants");
    expect(replaceMock).toHaveBeenCalledWith("access", "refresh");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/admin/tenants");
  });

  it("still calls exit-assume when the multi-tenancy flag is off", async () => {
    tenantManagementFlagMock.mockResolvedValue(false);
    authMock.mockResolvedValue({ accessToken: ASSUMED_TOKEN });
    exitMock.mockResolvedValue(ApiResult.success(TOKENS));

    await expect(exitAssumeAction()).rejects.toThrow("REDIRECT:/admin/tenants");
    expect(exitMock).toHaveBeenCalled();
  });

  it("does not call the API when the session is not assumed", async () => {
    authMock.mockResolvedValue({
      accessToken: unsignedJwt({ sub: "7", tid: "1" }),
    });

    const result = await exitAssumeAction();

    expect(Result.isError(result)).toBe(true);
    expect(exitMock).not.toHaveBeenCalled();
  });
});
