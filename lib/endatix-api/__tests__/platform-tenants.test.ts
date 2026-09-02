import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("PlatformTenants", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-numeric tenant id before calling the API", async () => {
    const api = new EndatixApi("token");
    const result = await api.platformTenants.getById("abc");

    expect(ApiResult.isError(result)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("GETs a tenant by id", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "1",
          name: "Acme",
          shortUrl: "xk9mp2qr",
          allowSelfRegistration: false,
          allowedAuthProviderKeys: [],
          defaultRegistrationRoleName: "Respondent",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const api = new EndatixApi("token");
    const result = await api.platformTenants.getById("1");

    expect(ApiResult.isSuccess(result)).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tenants/1"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("POSTs create without a slug field", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "1",
          name: "Acme",
          shortUrl: "xk9mp2qr",
          allowSelfRegistration: false,
          allowedAuthProviderKeys: [],
          defaultRegistrationRoleName: "Respondent",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const api = new EndatixApi("token");
    const body = {
      name: "Acme",
      allowSelfRegistration: false,
    };
    await api.platformTenants.create(body);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/tenants"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).not.toHaveProperty(
      "slug",
    );
  });
});
