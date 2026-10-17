import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { loadSubmissionGridRows } from "../browse-submissions.server";
import { parseSubmissionGridUrl } from "../submission-grid-url";

const listRows = vi.fn();

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  class MockEndatixApi {
    reporting = { submissionGrid: { listRows } };
  }
  return { ...actual, EndatixApi: MockEndatixApi };
});

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
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
