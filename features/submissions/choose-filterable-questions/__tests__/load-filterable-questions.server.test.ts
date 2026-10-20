import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { SubmissionGridColumnsResponse } from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import {
  loadFilterableQuestions,
  resolveFilterableQuestionsLoad,
} from "../load-filterable-questions.server";

const mockReportingExportFlag = vi.fn();
const mockListColumns = vi.fn();
const mockCheckPermission = vi.fn();

vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

vi.mock("@/features/auth/authorization", () => ({
  Permissions: { Forms: { Edit: "forms.edit" } },
  authorization: vi.fn().mockResolvedValue({
    checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
  }),
}));

vi.mock("@/lib/feature-flags/flags", () => ({
  reportingExportFlag: () => mockReportingExportFlag(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn().mockImplementation(function () {
    return {
      reporting: {
        submissionGrid: {
          listColumns: (...args: unknown[]) => mockListColumns(...args),
        },
      },
    };
  }),
}));

const SLOTS = { used: 51, max: 64, userUsed: 1, userMax: 14 };

function columnsResponse(
  overrides: Partial<SubmissionGridColumnsResponse> = {},
): SubmissionGridColumnsResponse {
  return {
    formId: "5",
    schemaReady: true,
    readiness: {
      submissions: 0,
      completedSubmissions: 0,
      prepared: 0,
      pending: 0,
      failed: 0,
      skippedInProgress: 0,
    },
    columns: [
      {
        key: "city",
        kind: "Simple",
        title: "City",
        questionType: "text",
        filterType: "text",
        searchable: true,
        searchPending: true,
        searchSource: "user",
        pageName: null,
        pageTitle: null,
        panelTitle: null,
      },
    ],
    searchSlots: SLOTS,
    ...overrides,
  };
}

describe("resolveFilterableQuestionsLoad", () => {
  it("lists the search keys with the slots and the edit grant", () => {
    // Act
    const load = resolveFilterableQuestionsLoad(
      Result.success(columnsResponse()),
      false,
    );

    // Assert
    expect(load).toEqual({
      kind: "ready",
      questions: [
        { key: "city", title: "City", source: "user", preparing: true },
      ],
      slots: SLOTS,
      canEdit: false,
    });
  });

  it("hides the section for an API that cannot choose search keys", () => {
    // Act
    const load = resolveFilterableQuestionsLoad(
      Result.success(columnsResponse({ searchSlots: undefined })),
      true,
    );

    // Assert
    expect(load).toEqual({ kind: "hidden" });
  });

  it("hides the section when the form has no reporting (404)", () => {
    // Arrange
    const notFound = Result.error<SubmissionGridColumnsResponse>(
      "Not found",
      undefined,
      undefined,
      { statusCode: 404 },
    );

    // Act & Assert
    expect(resolveFilterableQuestionsLoad(notFound, true)).toEqual({
      kind: "hidden",
    });
  });

  it("says why other failures left the list out", () => {
    // Arrange
    const failure = Result.error<SubmissionGridColumnsResponse>("Boom");

    // Act & Assert
    expect(resolveFilterableQuestionsLoad(failure, true)).toEqual({
      kind: "error",
      result: failure,
    });
  });
});

describe("loadFilterableQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReportingExportFlag.mockResolvedValue(true);
    mockListColumns.mockResolvedValue(ApiResult.success(columnsResponse()));
    mockCheckPermission.mockResolvedValue({ success: true });
  });

  it("reads nothing when the reporting flag is off", async () => {
    // Arrange
    mockReportingExportFlag.mockResolvedValue(false);

    // Act
    const load = await loadFilterableQuestions("5");

    // Assert
    expect(load).toEqual({ kind: "hidden" });
    expect(mockListColumns).not.toHaveBeenCalled();
  });

  it("lets editors change the list only with forms.edit", async () => {
    // Arrange
    mockCheckPermission.mockResolvedValue({ success: false });

    // Act
    const load = await loadFilterableQuestions("5");

    // Assert
    expect(load).toMatchObject({ kind: "ready", canEdit: false });
    expect(mockCheckPermission).toHaveBeenCalledWith("forms.edit");
  });
});
