import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("PublicTenants", () => {
  let api: EndatixApi;

  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    api = new EndatixApi();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gets a public tenant by slug without auth", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          slug: "xK9mP2qR8vNw",
          name: "Acme",
          selfRegistrationEnabled: true,
          allowedAuthProviders: ["endatix"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await api.publicTenants.getBySlug("xK9mP2qR8vNw");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/tenants/xK9mP2qR8vNw"),
      expect.objectContaining({ method: "GET" }),
    );
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(ApiResult.isSuccess(result)).toBe(true);
  });
});
