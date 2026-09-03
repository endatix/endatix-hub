import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import {
  getPublicTenantAction,
  registerTenantAccountAction,
} from "../public-tenant.action";

const { getBySlugMock, registerMock } = vi.hoisted(() => ({
  getBySlugMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    publicTenants = { getBySlug: getBySlugMock };
    auth = { register: registerMock };
  },
}));

describe("public-tenant actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps a public tenant load through toResult", async () => {
    getBySlugMock.mockResolvedValueOnce(
      ApiResult.success({
        shortUrl: "xk9mp2qr",
        name: "Acme",
        selfRegistrationEnabled: true,
        allowedAuthProviders: ["endatix"],
      }),
    );

    const result = await getPublicTenantAction("xk9mp2qr");

    expect(Result.isSuccess(result)).toBe(true);
    expect(getBySlugMock).toHaveBeenCalledWith("xk9mp2qr");
  });

  it("keeps a 404 status on a missing tenant", async () => {
    getBySlugMock.mockResolvedValueOnce(
      ApiResult.notFoundError("Tenant not found", {
        statusCode: 404,
      }),
    );

    const result = await getPublicTenantAction("missing1");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.statusCode).toBe(404);
    }
  });

  it("registers with the API tenantSlug field", async () => {
    registerMock.mockResolvedValueOnce(
      ApiResult.success({ success: true, message: "ok" }),
    );
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "Password123!");

    const result = await registerTenantAccountAction(
      "xk9mp2qr",
      null,
      formData,
    );

    expect(result.success).toBe(true);
    expect(registerMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      tenantSlug: "xk9mp2qr",
    });
  });
});
