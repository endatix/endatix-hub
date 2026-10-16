import { describe, expect, it } from "vitest";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type {
  SubmissionGridColumnsResponse,
  SubmissionGridRow,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import {
  isReportingNotPrepared,
  resolveSubmissionGridColumnsLoad,
  resolveSubmissionGridRowsLoad,
  withAnswerFiltersNotPrepared,
} from "../resolve-submission-grid-load";
import { parseSubmissionGridUrl } from "../submission-grid-url";

const READINESS = {
  submissions: 1,
  completedSubmissions: 1,
  prepared: 1,
  pending: 0,
  failed: 0,
  skippedInProgress: 0,
};

function rowsPage(totalRecords: number) {
  return normalizePagedResponse<SubmissionGridRow>({
    items: [],
    page: 1,
    pageSize: 10,
    totalRecords,
    totalPages: Math.ceil(totalRecords / 10),
  });
}

describe("resolveSubmissionGridColumnsLoad", () => {
  it("hands over to another grid when the API has no grid for the form", () => {
    // Arrange
    const notFound = Result.error<SubmissionGridColumnsResponse>(
      "Not found",
      undefined,
      undefined,
      {
        statusCode: 404,
      },
    );

    // Act & Assert
    expect(resolveSubmissionGridColumnsLoad(notFound)).toEqual({
      kind: "unavailable",
    });
  });

  it("reports other failures as errors", () => {
    // Arrange
    const failure = Result.error<SubmissionGridColumnsResponse>(
      "Boom",
      undefined,
      undefined,
      {
        statusCode: 500,
      },
    );

    // Act & Assert
    expect(resolveSubmissionGridColumnsLoad(failure).kind).toBe("error");
  });

  it("maps the columns into the grid's catalog", () => {
    // Act
    const load = resolveSubmissionGridColumnsLoad(
      Result.success({
        formId: "1",
        schemaReady: true,
        readiness: READINESS,
        columns: [],
      }),
    );

    // Assert
    expect(load).toEqual({
      kind: "ready",
      schemaReady: true,
      readiness: READINESS,
      catalog: [],
    });
  });

  it("keeps the form's search slots for the column picker", () => {
    // Arrange
    const searchSlots = { used: 52, max: 64, userUsed: 2, userMax: 14 };

    // Act
    const load = resolveSubmissionGridColumnsLoad(
      Result.success({
        formId: "1",
        schemaReady: true,
        readiness: READINESS,
        columns: [],
        searchSlots,
      }),
    );

    // Assert
    expect(load).toMatchObject({ kind: "ready", searchSlots });
  });
});

describe("resolveSubmissionGridRowsLoad", () => {
  it("redirects a page past the end to the last page", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ page: "9", status: "new" });

    // Act
    const load = resolveSubmissionGridRowsLoad(
      "5",
      state,
      Result.success(rowsPage(25)),
    );

    // Assert
    expect(load).toEqual({
      kind: "redirect",
      href: "/forms/5/submissions?page=3&status=new",
    });
  });

  it("redirects to the first page when nothing matches", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ page: "2" });

    // Act
    const load = resolveSubmissionGridRowsLoad(
      "5",
      state,
      Result.success(rowsPage(0)),
    );

    // Assert
    expect(load).toEqual({ kind: "redirect", href: "/forms/5/submissions" });
  });

  it("renders a page in range", () => {
    // Arrange
    const state = parseSubmissionGridUrl({});

    // Act
    const load = resolveSubmissionGridRowsLoad(
      "5",
      state,
      Result.success(rowsPage(3)),
    );

    // Assert
    expect(load.kind).toBe("ready");
  });
});

describe("isReportingNotPrepared", () => {
  it.each([
    [Result.error("No schema", undefined, "reporting_not_prepared"), true],
    [Result.error("Conflict", undefined, "conflict"), false],
    [Result.success(1), false],
  ])("reads %j as %s", (result, expected) => {
    expect(isReportingNotPrepared(result)).toBe(expected);
  });
});

describe("withAnswerFiltersNotPrepared", () => {
  it("marks ready rows as read without answer filters", () => {
    // Arrange
    const load = { kind: "ready" as const, page: rowsPage(0) };

    // Act & Assert
    expect(withAnswerFiltersNotPrepared(load)).toEqual({
      ...load,
      answerFiltersNotPrepared: true,
    });
  });

  it("leaves a redirect as it is", () => {
    // Arrange
    const load = { kind: "redirect" as const, href: "/forms/1/submissions" };

    // Act & Assert
    expect(withAnswerFiltersNotPrepared(load)).toBe(load);
  });
});
