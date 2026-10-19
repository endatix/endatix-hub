import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { canEditSubmissionGrid } from "../browse-submissions.server";

const checkPermission = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: async () => ({ checkPermission }),
}));

describe("canEditSubmissionGrid", () => {
  beforeEach(() => {
    checkPermission.mockReset();
  });

  it("allows users who may edit the form", async () => {
    // Arrange
    checkPermission.mockResolvedValue({ success: true, data: true });

    // Act
    const allowed = await canEditSubmissionGrid();

    // Assert
    expect(allowed).toBe(true);
    expect(checkPermission).toHaveBeenCalledWith(Permissions.Forms.Edit);
  });

  it("hides the action from users who may not edit the form", async () => {
    // Arrange
    checkPermission.mockResolvedValue({
      success: false,
      error: { type: "ACCESS_DENIED", message: "Access denied" },
    });

    // Act & Assert
    expect(await canEditSubmissionGrid()).toBe(false);
  });
});
