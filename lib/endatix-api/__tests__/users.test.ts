import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Users API", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
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
});
