import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPlatformAdminUsers } from "../../list-platform-admins/list-platform-admins.server";
import type { PlatformAdminSession } from "../../types";
import { listSignupReviewers } from "../list-signup-reviewers.server";

vi.mock("server-only", () => ({}));
vi.mock("../../list-platform-admins/list-platform-admins.server", () => ({
  listPlatformAdminUsers: vi.fn(),
}));

const session = { accessToken: "token" } as PlatformAdminSession;

describe("listSignupReviewers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("labels each admin by display name, then email, then user name", async () => {
    // Arrange
    vi.mocked(listPlatformAdminUsers).mockResolvedValue({
      items: [
        {
          id: "1",
          displayName: "Ada Admin",
          email: "ada@x.io",
          userName: "ada",
        },
        { id: "2", displayName: null, email: "bo@x.io", userName: "bo" },
        { id: "3", displayName: " ", email: null, userName: "cy" },
      ],
    } as never);

    // Act
    const reviewers = await listSignupReviewers(session);

    // Assert
    expect(reviewers).toEqual({ "1": "Ada Admin", "2": "bo@x.io", "3": "cy" });
  });

  it("returns no names instead of failing the page when the lookup fails", async () => {
    // Arrange
    vi.mocked(listPlatformAdminUsers).mockRejectedValue(new Error("down"));

    // Act & Assert
    await expect(listSignupReviewers(session)).resolves.toEqual({});
  });
});
