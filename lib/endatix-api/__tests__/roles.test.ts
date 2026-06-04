import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Roles API", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  it("builds the list roles endpoint with paging and filters", async () => {
    // Arrange
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          page: 3,
          pageSize: 50,
          totalPages: 0,
          totalRecords: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    // Act
    await api.roles.list({
      page: 3,
      pageSize: 50,
      roleType: "custom",
      search: "data steward",
    });

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ci.api.endatix.com/api/roles?page=3&pageSize=50&roleType=custom&search=data+steward",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
