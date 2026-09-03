import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { buildListPlatformTenantsEndpoint } from "../platform-tenants/platform-tenants";

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

describe("buildListPlatformTenantsEndpoint", () => {
  it("applies the default page and page size", () => {
    expect(buildListPlatformTenantsEndpoint()).toBe(
      "/admin/tenants?page=1&pageSize=10",
    );
  });

  it("maps search, sort, and calendar bounds onto the flat wire contract", () => {
    const endpoint = buildListPlatformTenantsEndpoint({
      page: 2,
      pageSize: 25,
      search: "acme",
      sortBy: "name",
      sortDir: "asc",
      createdFrom: "2026-01-01",
      createdTo: "2026-01-31",
      modifiedFrom: "2026-02-01",
    });

    expect(decodeURIComponent(endpoint)).toBe(
      "/admin/tenants?page=2&pageSize=25&sortBy=name&sortDir=asc&createdFrom=2026-01-01&createdTo=2026-01-31&modifiedFrom=2026-02-01&search=acme",
    );
  });
});

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

  it("lists one page and keeps the paging envelope", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "1",
              name: "Acme",
              shortUrl: "xk9mp2qr",
              createdAt: "2026-01-01T00:00:00.000Z",
              formsCount: 0,
              submissionsCount: 0,
              selfRegistrationEnabled: false,
            },
          ],
          page: 1,
          pageSize: 10,
          totalRecords: 11,
          totalPages: 2,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await new EndatixApi("token").platformTenants.list({
      search: "acme",
    });

    expect(ApiResult.isSuccess(result)).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.hasNextPage).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/admin/tenants?page=1&pageSize=10&search=acme",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });
});
