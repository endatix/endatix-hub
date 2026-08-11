import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("EndatixApi rawBody headers", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("strips application/json Content-Type from defaultHeaders when rawBody is true", async () => {
    // Arrange
    const api = new EndatixApi(undefined, {
      defaultHeaders: { "Content-Type": "application/json" },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: "No Content" }),
    );

    // Act
    const result = await api.request("/test", {
      method: "POST",
      requireAuth: false,
      rawBody: true,
      body: "plain-text-payload",
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(requestInit.body).toBe("plain-text-payload");
  });

  it("preserves non-JSON Content-Type on rawBody requests", async () => {
    // Arrange
    const api = new EndatixApi(undefined, {
      defaultHeaders: { "Content-Type": "application/json" },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: "No Content" }),
    );

    // Act
    const result = await api.request("/test", {
      method: "POST",
      requireAuth: false,
      rawBody: true,
      body: "a,b\n1,2",
      headers: { "Content-Type": "text/csv" },
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("text/csv");
  });

  it("keeps application/json Content-Type for non-raw JSON requests", async () => {
    // Arrange
    const api = new EndatixApi();
    mockFetch.mockResolvedValueOnce(
      new Response(null, { status: 204, statusText: "No Content" }),
    );

    // Act
    const result = await api.request("/test", {
      method: "POST",
      requireAuth: false,
      body: { name: "item" },
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(requestInit.body).toBe(JSON.stringify({ name: "item" }));
  });

  it.each(["", 0, false] as const)(
    "sets application/json Content-Type for falsy JSON body %j",
    async (body) => {
      // Arrange
      const api = new EndatixApi();
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204, statusText: "No Content" }),
      );

      // Act
      const result = await api.request("/test", {
        method: "POST",
        requireAuth: false,
        body,
      });

      // Assert
      expect(ApiResult.isSuccess(result)).toBe(true);
      const [, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = requestInit.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(requestInit.body).toBe(JSON.stringify(body));
    },
  );
});
