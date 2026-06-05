import { beforeEach, describe, expect, it, vi } from "vitest";
import { EndatixApi } from "../endatix-api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Email API", () => {
  beforeEach(() => {
    process.env.ENDATIX_API_URL = "https://ci.api.endatix.com/api";
    mockFetch.mockReset();
  });

  it("sends test email with sender address", async () => {
    const api = new EndatixApi("access-token");
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify("Test email sent successfully."), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await api.email.sendTestEmail({
      toEmail: "admin@example.com",
      fromEmail: "noreply@example.com",
      templateId: "user-invitation",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://ci.api.endatix.com/api/admin/email/test",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          toEmail: "admin@example.com",
          fromEmail: "noreply@example.com",
          templateId: "user-invitation",
        }),
      }),
    );
  });
});
