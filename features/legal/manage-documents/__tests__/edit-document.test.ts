import { beforeEach, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { editDocument } from "../edit-document.action";

const { enabled, guard, put, post } = vi.hoisted(() => ({
  enabled: vi.fn(),
  guard: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  termsAcceptanceEnabled: enabled,
}));
vi.mock("@/features/platform-admin/server", () => ({
  requirePlatformAdmin: guard,
}));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    put = put;
    post = post;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const edit = {
  kind: "terms",
  revision: "9007199254740993",
  operation: "publish",
  change: "minor",
} as const;
beforeEach(() => {
  enabled.mockResolvedValue(true);
  guard.mockResolvedValue({ accessToken: "test" });
  post.mockResolvedValue({ success: true, data: {} });
});

it("publishes only the displayed revision and explicit change", async () => {
  // Act
  const result = await editDocument(edit);
  // Assert
  expect(Result.isSuccess(result)).toBe(true);
  expect(post).toHaveBeenCalledWith("/admin/legal/documents/terms/versions", {
    revision: edit.revision,
    change: "minor",
  });
});

it("refuses a direct write when legal management is disabled", async () => {
  // Arrange
  enabled.mockResolvedValue(false);
  // Act & Assert
  expect(Result.isError(await editDocument(edit))).toBe(true);
  expect(post).not.toHaveBeenCalled();
});

it("requires ordinary platform authorization before publishing", async () => {
  // Arrange
  guard.mockRejectedValueOnce(new Error("Forbidden"));
  // Act & Assert
  await expect(editDocument(edit)).rejects.toThrow("Forbidden");
  expect(post).not.toHaveBeenCalled();
});
