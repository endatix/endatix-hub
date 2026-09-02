import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const TENANT = {
  id: "1",
  name: "Acme",
  shortUrl: "xk9mp2qr",
  allowSelfRegistration: false,
  allowedAuthProviderKeys: [],
  defaultRegistrationRoleName: "Respondent",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function respondWithTenant(status: number): void {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(TENANT), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("PlatformTenants", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["getById", (api: EndatixApi) => api.platformTenants.getById("abc")],
    ["update", (api: EndatixApi) => api.platformTenants.update("../1", {})],
  ])("rejects a non-numeric tenant id in %s", async (_name, call) => {
    const result = await call(new EndatixApi("token"));

    expect(ApiResult.isError(result)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("GETs a tenant by id", async () => {
    respondWithTenant(200);

    const result = await new EndatixApi("token").platformTenants.getById("1");

    expect(ApiResult.isSuccess(result)).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tenants/1"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("POSTs create without a slug field", async () => {
    respondWithTenant(201);
    const body = { name: "Acme", allowSelfRegistration: false };

    await new EndatixApi("token").platformTenants.create(body);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tenants"),
      expect.objectContaining({ method: "POST", body: JSON.stringify(body) }),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).not.toHaveProperty(
      "slug",
    );
  });

  it("PATCHes only the supplied fields", async () => {
    respondWithTenant(200);
    const body = { allowSelfRegistration: true };

    await new EndatixApi("token").platformTenants.update("42", body);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tenants/42"),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(body) }),
    );
  });
});
