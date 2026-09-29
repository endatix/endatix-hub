import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { refreshIncompleteSubmissionsAction } from "../refresh-incomplete-submissions.action";

const mockRequireHubAccess = vi.fn();
const mockCheckPermission = vi.fn();
const mockBackfillSubmissions = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ accessToken: "token" }),
}));

vi.mock("@/features/auth/authorization", async () => {
  const domain =
    await import("@/features/auth/authorization/domain/authorization-result");
  return {
    Permissions: { Forms: { Edit: "forms.edit" } },
    isPermissionDenied: domain.isPermissionDenied,
    authorization: vi.fn().mockResolvedValue({
      requireHubAccess: (...args: unknown[]) => mockRequireHubAccess(...args),
      checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
    }),
  };
});

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      reporting: {
        backfillSubmissions: (...args: unknown[]) =>
          mockBackfillSubmissions(...args),
      },
    };
  }),
}));

function page(overrides: Record<string, unknown> = {}) {
  return ApiResult.success({
    processed: 1,
    skipped: 0,
    failed: 0,
    hasMore: false,
    nextAfterSubmissionId: null,
    ...overrides,
  });
}

describe("refreshIncompleteSubmissionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireHubAccess.mockResolvedValue(undefined);
    mockCheckPermission.mockResolvedValue(AuthorizationResult.success());
    mockBackfillSubmissions.mockResolvedValue(page());
  });

  it("backfills incomplete submissions for users who can edit the form", async () => {
    // Act
    const result = await refreshIncompleteSubmissionsAction("form-1");

    // Assert
    expect(mockCheckPermission).toHaveBeenCalledWith("forms.edit");
    expect(mockBackfillSubmissions).toHaveBeenCalledWith("form-1", {
      batchSize: 100,
      afterSubmissionId: undefined,
      force: undefined,
      completionScope: "incomplete",
    });
    expect(result).toEqual(
      Result.success({ kind: "refreshed", failed: 0, finished: true }),
    );
  });

  it("skips the refresh, without failing, when the user cannot edit forms", async () => {
    // Arrange
    mockCheckPermission.mockResolvedValue(AuthorizationResult.forbidden());

    // Act
    const result = await refreshIncompleteSubmissionsAction("form-1");

    // Assert
    expect(result).toEqual(Result.success({ kind: "skipped" }));
    expect(mockBackfillSubmissions).not.toHaveBeenCalled();
  });

  it("fails when the permission check itself errors", async () => {
    // Arrange
    mockCheckPermission.mockResolvedValue(AuthorizationResult.error());

    // Act
    const result = await refreshIncompleteSubmissionsAction("form-1");

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(mockBackfillSubmissions).not.toHaveBeenCalled();
  });

  it("reports failures and an unfinished run instead of failing the export", async () => {
    // Arrange
    mockBackfillSubmissions.mockResolvedValue(
      page({ failed: 1, hasMore: true, nextAfterSubmissionId: "next" }),
    );

    // Act
    const result = await refreshIncompleteSubmissionsAction("form-1");

    // Assert
    expect(mockBackfillSubmissions).toHaveBeenCalledTimes(100);
    expect(result).toEqual(
      Result.success({ kind: "refreshed", failed: 100, finished: false }),
    );
  });

  it("returns API failures as errors", async () => {
    // Arrange
    mockBackfillSubmissions.mockResolvedValue(
      ApiResult.serverError("Backfill blew up"),
    );

    // Act
    const result = await refreshIncompleteSubmissionsAction("form-1");

    // Assert
    expect(Result.isError(result)).toBe(true);
  });
});
