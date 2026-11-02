import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSubmissionGridViewAction } from "../save-submission-grid-view.action";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  flag: vi.fn(),
  requirePermission: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "token" }) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({
    requireHubAccess: vi.fn(),
    requirePermission: mocks.requirePermission,
  }),
  Permissions: { Forms: { Edit: "forms.edit" } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: mocks.flag,
}));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    reporting = { submissionViews: { save: mocks.save } };
  },
}));

const VIEW = { version: "3", settings: { v: 1 as const, columns: [] } };

describe("saveSubmissionGridViewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.flag.mockResolvedValue(true);
  });

  it("saves for form editors and returns the new view", async () => {
    // Arrange
    const saved = { ...VIEW, version: "4" };
    mocks.save.mockResolvedValue(ApiResult.success(saved));

    // Act
    const result = await saveSubmissionGridViewAction("42", VIEW);

    // Assert
    expect(mocks.requirePermission).toHaveBeenCalledWith("forms.edit");
    expect(mocks.save).toHaveBeenCalledWith("42", VIEW);
    expect(result).toEqual(Result.success(saved));
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/(main)/forms/42/submissions",
    );
  });

  it("keeps the 409 status so the grid can reload", async () => {
    // Arrange
    mocks.save.mockResolvedValue(
      ApiResult.conflictError("Stale version", { statusCode: 409 }),
    );

    // Act
    const result = await saveSubmissionGridViewAction("42", VIEW);

    // Assert
    expect(Result.isError(result) && result.statusCode).toBe(409);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses when reporting is off, without calling the API", async () => {
    // Arrange
    mocks.flag.mockResolvedValue(false);

    // Act
    const result = await saveSubmissionGridViewAction("42", VIEW);

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
