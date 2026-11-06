import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { loadSubmissionExportAccess } from "../export-access.server";

const mockEvaluatePermissions = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/authorization", () => ({
  Permissions: {
    Forms: { Edit: "forms.edit" },
    Submissions: { Export: "submissions.export" },
  },
  authorization: vi.fn().mockResolvedValue({
    evaluatePermissions: (...args: unknown[]) =>
      mockEvaluatePermissions(...args),
  }),
}));

function grants(exportGrant: boolean, editGrant: boolean) {
  return {
    success: true,
    data: { "submissions.export": exportGrant, "forms.edit": editGrant },
  };
}

describe("loadSubmissionExportAccess", () => {
  beforeEach(() => {
    mockEvaluatePermissions.mockReset();
  });

  it.each([
    {
      who: "an exporter",
      granted: [true, false],
      expected: { canExport: true, canPrepare: true, canRebuild: false },
    },
    {
      who: "a form editor",
      granted: [false, true],
      expected: { canExport: false, canPrepare: true, canRebuild: true },
    },
    {
      who: "a viewer",
      granted: [false, false],
      expected: { canExport: false, canPrepare: false, canRebuild: false },
    },
  ])("says what $who may do", async ({ granted, expected }) => {
    // Arrange
    mockEvaluatePermissions.mockResolvedValue(grants(granted[0], granted[1]));

    // Act
    const access = await loadSubmissionExportAccess();

    // Assert
    expect(mockEvaluatePermissions).toHaveBeenCalledWith([
      "submissions.export",
      "forms.edit",
    ]);
    expect(access).toEqual(expected);
  });

  it("allows nothing when the permission check fails", async () => {
    // Arrange
    mockEvaluatePermissions.mockResolvedValue(AuthorizationResult.error());

    // Act
    const access = await loadSubmissionExportAccess();

    // Assert
    expect(access).toEqual({
      canExport: false,
      canPrepare: false,
      canRebuild: false,
    });
  });
});
