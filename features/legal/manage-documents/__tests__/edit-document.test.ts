import { beforeEach, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { editDocument, previewDraft } from "../edit-document.action";

const { enabled, guard, put, post, get } = vi.hoisted(() => ({
  enabled: vi.fn(),
  guard: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
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
    get = get;
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

it("previews only saved data using ordinary platform authorization", async () => {
  // Arrange
  get.mockResolvedValue({
    success: true,
    data: { kind: "privacy", revision: "5", draftMarkdown: "Synthetic" },
  });
  // Act
  const result = await previewDraft("privacy");
  // Assert
  expect(result).toEqual(Result.success({ kind: "privacy", revision: "5", draftMarkdown: "Synthetic" }));
  expect(get).toHaveBeenCalledWith("/admin/legal/documents/privacy/preview");
  expect(guard).toHaveBeenCalledTimes(1);
});

it.each([
  { operation: "draft" as const, markdown: "Synthetic", path: "draft", body: { markdown: "Synthetic" } },
  { operation: "required" as const, required: false, path: "required", body: { required: false } },
])("sends the $operation to the displayed Terms revision", async ({ path, body, ...operation }) => {
  // Arrange
  put.mockResolvedValue({ success: true, data: { revision: "9" } });
  // Act
  const result = await editDocument({ kind: "terms", revision: "8", ...operation });
  // Assert
  expect(result).toEqual(Result.success({ revision: "9" }));
  expect(put).toHaveBeenCalledWith(`/admin/legal/documents/terms/${path}`, { revision: "8", ...body });
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
