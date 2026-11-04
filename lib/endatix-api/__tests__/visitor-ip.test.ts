import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientIpEnv } from "@/lib/hosting/trusted-proxies";
import { registerVisitorIpForwarding } from "@/lib/hosting/visitor-ip.server";
import { EndatixApi } from "../endatix-api";
import { createPublicDataListsClient } from "../public/data-lists/public-data-lists.client";
import { ApiResult } from "../shared/api-result";
import { registerOutboundHeaders } from "../shared/outbound-headers";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.value,
}));

const mockFetch = vi.fn();

describe("EndatixApi visitor IP", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("ENDATIX_API_URL", "https://ci.api.endatix.com/api");
    vi.stubEnv(ClientIpEnv.TRUSTED_PROXIES, "10.0.0.0/8");
    requestHeaders.value = new Headers({
      "X-Forwarded-For": "1.2.3.4, 203.0.113.9, 10.0.0.5",
    });
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(Response.json({ ok: true }));
    registerVisitorIpForwarding();
  });

  afterEach(() => {
    registerOutboundHeaders(undefined);
    vi.unstubAllGlobals();
  });

  it("sends the one visitor address on request()", async () => {
    // Act
    await new EndatixApi().request("/forms", { requireAuth: false });

    // Assert
    const init: RequestInit = mockFetch.mock.calls[0][1];
    expect(new Headers(init.headers).get("X-Forwarded-For")).toBe(
      "203.0.113.9",
    );
  });

  it("sends the one visitor address on requestStream()", async () => {
    // Act
    await new EndatixApi().requestStream("/forms/1/export", {
      requireAuth: false,
    });

    // Assert
    const init: RequestInit = mockFetch.mock.calls[0][1];
    expect(new Headers(init.headers).get("X-Forwarded-For")).toBe(
      "203.0.113.9",
    );
  });

  it("resolves to an error result when the body cannot be serialized", async () => {
    // Act
    const result = await new EndatixApi().request("/forms", {
      method: "POST",
      requireAuth: false,
      body: { id: BigInt(1) },
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the one visitor address on public data-list lookups", async () => {
    // Arrange
    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
    });

    // Act
    await client.search({
      formId: "101",
      dataListId: "12",
      query: "bul",
      formAccessJwt: "form-access-jwt",
    });

    // Assert
    const init: RequestInit = mockFetch.mock.calls[0][1];
    expect(new Headers(init.headers).get("X-Forwarded-For")).toBe(
      "203.0.113.9",
    );
  });

  it("sends no visitor address where the Hub registered no forwarding", async () => {
    // Arrange
    registerOutboundHeaders(undefined);

    // Act
    await new EndatixApi().request("/forms", { requireAuth: false });

    // Assert
    const init: RequestInit = mockFetch.mock.calls[0][1];
    expect(new Headers(init.headers).has("X-Forwarded-For")).toBe(false);
  });
});
