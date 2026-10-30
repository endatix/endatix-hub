import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  canEditSubmissionGrid,
  loadSubmissionGridView,
} from "../browse-submissions.server";
import { DEFAULT_SUBMISSION_VIEW_SETTINGS } from "../submission-grid-view";

const checkPermission = vi.hoisted(() => vi.fn());
const getView = vi.hoisted(() => vi.fn());

vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {
    reporting = { submissionViews: { get: getView } };
  },
}));

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

describe("loadSubmissionGridView", () => {
  beforeEach(() => {
    getView.mockReset();
  });

  it("hands back the saved view with what the grid cannot use dropped", async () => {
    // Arrange
    getView.mockResolvedValue(
      ApiResult.success({
        version: "7",
        settings: {
          v: 1,
          columns: [{ key: "q1", width: "wide" }],
          pageSize: 20,
        },
      }),
    );

    // Act
    const view = await loadSubmissionGridView("42", undefined);

    // Assert
    expect(getView).toHaveBeenCalledWith("42");
    expect(view).toEqual({
      version: "7",
      settings: { v: 1, columns: [{ key: "q1" }], pageSize: 20 },
    });
  });

  it("shows the defaults and withholds the version when the view cannot be read", async () => {
    // Arrange
    getView.mockResolvedValue(ApiResult.forbiddenError("No access."));

    // Act
    const view = await loadSubmissionGridView("42", undefined);

    // Assert
    expect(view).toEqual({
      version: null,
      settings: DEFAULT_SUBMISSION_VIEW_SETTINGS,
    });
  });
});
