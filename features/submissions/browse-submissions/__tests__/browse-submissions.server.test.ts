import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  canEditSubmissionGrid,
  loadSubmissionGridRows,
  loadSubmissionGridView,
} from "../browse-submissions.server";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import { DEFAULT_SUBMISSION_VIEW_SETTINGS } from "../submission-grid-view";

const listRows = vi.fn();
const checkPermission = vi.hoisted(() => vi.fn());
const getView = vi.hoisted(() => vi.fn());

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  class MockEndatixApi {
    reporting = {
      submissionGrid: { listRows },
      submissionViews: { get: getView },
    };
  }
  return { ...actual, EndatixApi: MockEndatixApi };
});

vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({ checkPermission }),
  Permissions: { Forms: { Edit: "forms.edit" } },
}));

const EMPTY_PAGE = {
  items: [],
  page: 1,
  pageSize: 10,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
};

function notPrepared() {
  return ApiResult.conflictError(
    "Reporting is not prepared",
    { statusCode: 409 },
    "reporting_not_prepared",
  );
}

function loadWith(raw: Record<string, string>) {
  return loadSubmissionGridRows({
    formId: "5",
    urlState: parseSubmissionGridUrl(raw),
    columnKeys: ["q1"],
    session: undefined,
  });
}

describe("loadSubmissionGridRows", () => {
  beforeEach(() => {
    listRows.mockReset();
  });

  it("reads the page again without answer filters when the form has no schema", async () => {
    // Arrange
    listRows
      .mockResolvedValueOnce(notPrepared())
      .mockResolvedValueOnce(ApiResult.success(EMPTY_PAGE));

    // Act
    const load = await loadWith({
      status: "new",
      "answer.contains.q1": "acme",
    });

    // Assert
    expect(load).toMatchObject({
      kind: "ready",
      answerFiltersNotPrepared: true,
    });
    expect(listRows).toHaveBeenLastCalledWith(
      "5",
      expect.objectContaining({ status: ["new"], answerFilters: [] }),
    );
  });

  it("returns an empty filtered page as a normal empty page", async () => {
    // Arrange
    listRows.mockResolvedValueOnce(ApiResult.success(EMPTY_PAGE));

    // Act
    const load = await loadWith({ "answer.contains.q1": "nothing" });

    // Assert
    expect(load).toEqual({ kind: "ready", page: EMPTY_PAGE });
    expect(listRows).toHaveBeenCalledTimes(1);
  });

  it("shows the conflict as an error when no answer filter was sent", async () => {
    // Arrange
    listRows.mockResolvedValueOnce(notPrepared());

    // Act
    const load = await loadWith({});

    // Assert
    expect(load.kind).toBe("error");
    expect(listRows).toHaveBeenCalledTimes(1);
  });
});

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
