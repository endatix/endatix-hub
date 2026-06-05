import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Users API", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  it("builds the list users endpoint with paging and filters", async () => {
    // Arrange
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [],
          page: 2,
          pageSize: 25,
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
    await api.users.list({
      page: 2,
      pageSize: 25,
      search: "Jane Admin",
      role: "Admin",
      status: "active",
    });

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ci.api.endatix.com/api/users?page=2&pageSize=25&search=Jane+Admin&role=Admin&status=active",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("keeps listed user ids as strings", async () => {
    // Arrange
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "1507759960832868352",
              userName: "Jane Admin",
              email: "jane@example.com",
              isVerified: true,
              roles: ["Admin"],
            },
          ],
          page: 1,
          pageSize: 25,
          totalPages: 1,
          totalRecords: 1,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    // Act
    const result = await api.users.list();

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (!ApiResult.isSuccess(result)) {
      return;
    }
    expect(result.data.items[0]?.id).toBe("1507759960832868352");
  });

  it("sends an empty JSON body when resending an invite", async () => {
    // Arrange
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, message: "Invitation email sent." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    // Act
    await api.users.resendVerification("1507759960832868352");

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ci.api.endatix.com/api/users/1507759960832868352/resend-verification",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({}),
      }),
    );
  });

  it("replaces user roles with a PUT request", async () => {
    // Arrange
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, message: "User roles updated." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    // Act
    await api.users.replaceRoles("1507759960832868352", {
      roleNames: ["Admin", "Creator"],
    });

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      "https://ci.api.endatix.com/api/users/1507759960832868352/roles",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ roleNames: ["Admin", "Creator"] }),
      }),
    );
  });
});
