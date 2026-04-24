import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPublicDataListsClient } from "../public-data-lists.client";

describe("PublicDataListsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds search request with token and tokenType", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dataListId: 12,
          total: 1,
          skip: 5,
          take: 10,
          items: [{ label: "Bulgaria", value: "BG" }],
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
      token: "abc.token",
      tokenType: "AccessToken",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/search?skip=5&take=10&query=bul&token=abc.token&tokenType=AccessToken",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("builds display-values request with repeated values", async () => {
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
      token: "submission-token",
      tokenType: "SubmissionToken",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/public/forms/101/data-lists/12/display-values?values=BG&values=US&token=submission-token&tokenType=SubmissionToken",
      expect.objectContaining({ method: "GET" }),
    );
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
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("ValidationError");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
