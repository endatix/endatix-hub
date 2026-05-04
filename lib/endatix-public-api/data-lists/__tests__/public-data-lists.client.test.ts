import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPublicDataListsClient } from "../public-data-lists.client";

describe("PublicDataListsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends search with Bearer form access JWT only (no legacy query tokens)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 25,
          totalRecords: 0,
          totalPages: 0,
          items: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
    });
    const result = await client.search({
      formId: "101",
      dataListId: "12",
      query: "bul",
      skip: 5,
      take: 10,
      formAccessJwt: "form-access-jwt",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/search?skip=5&take=10&query=bul",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer form-access-jwt",
        }),
      }),
    );
  });

  it("builds display-values request with repeated values and Bearer JWT", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { label: "Bulgaria", value: "BG" },
          { label: "United States", value: "US" },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
    });
    const result = await client.getDisplayValues({
      formId: "101",
      dataListId: "12",
      values: ["BG", "US"],
      formAccessJwt: "jwt-1",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/display-values?values=BG&values=US",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
        }),
      }),
    );
  });

  it("uses constructor accessToken when request token is omitted", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 25,
          totalRecords: 0,
          totalPages: 0,
          items: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
      accessToken: "client-jwt",
    });

    // Act
    const result = await client.search({
      formId: "101",
      dataListId: "12",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/search?skip=0&take=25",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer client-jwt",
        }),
      }),
    );
  });

  it("prefers request formAccessJwt over constructor accessToken", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 25,
          totalRecords: 0,
          totalPages: 0,
          items: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
      accessToken: "client-jwt",
    });

    // Act
    const result = await client.search({
      formId: "101",
      dataListId: "12",
      formAccessJwt: "request-jwt",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/search?skip=0&take=25",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer request-jwt",
        }),
      }),
    );
  });

  it("returns validation error when no request token and no constructor accessToken", async () => {
    // Arrange
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
    });

    // Act
    const result = await client.search({
      formId: "101",
      dataListId: "12",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("ValidationError");
      expect(result.error.message).toContain("formAccessJwt");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns validation error for invalid ids and does not call fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = createPublicDataListsClient({
      baseUrl: "https://api.example.com",
    });
    const result = await client.search({
      formId: "bad-id",
      dataListId: "12",
      formAccessJwt: "x",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("ValidationError");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
