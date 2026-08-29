import { describe, expect, it } from "vitest";
import type { SubmissionListUrlState } from "@/features/submissions/list-submission-query";
import { ApiResult } from "@/lib/endatix-api";
import type { DefinitionField } from "@/lib/endatix-api";
import type {
  ListSubmissionsResponse,
  Submission,
} from "@/lib/endatix-api/submissions/types";
import { Result } from "@/lib/result";
import {
  getCanonicalPage,
  resolveSubmissionListPageLoad,
} from "../resolve-submission-list-page-load";

const FORM_ID = "42";

const baseListState: SubmissionListUrlState = {
  page: 1,
  pageSize: 25,
  isComplete: [],
  status: [],
  isTestSubmission: [],
  sorting: [],
};

function pagedResponse(
  overrides: Partial<ListSubmissionsResponse> = {},
): ListSubmissionsResponse {
  return {
    items: [{ id: "1" } as Submission],
    page: 1,
    pageSize: 25,
    totalRecords: 1,
    totalPages: 1,
    ...overrides,
  };
}

function successInput(
  overrides: Partial<Parameters<typeof resolveSubmissionListPageLoad>[0]> = {},
) {
  return {
    formId: FORM_ID,
    listState: baseListState,
    useReportingExport: false,
    hasActiveFilters: false,
    submissionsResult: Result.success(pagedResponse()),
    fieldsResult: Result.success([] as DefinitionField[]),
    probeResult: null,
    ...overrides,
  };
}

describe("getCanonicalPage", () => {
  it("returns default page when there are no pages", () => {
    expect(getCanonicalPage(3, 1, 0)).toBe(1);
  });

  it("clamps requested page above totalPages", () => {
    expect(getCanonicalPage(9, 1, 3)).toBe(3);
  });

  it("follows a positive response page that differs from the request", () => {
    expect(getCanonicalPage(2, 1, 5)).toBe(1);
  });

  it("keeps the requested page when it matches", () => {
    expect(getCanonicalPage(2, 2, 5)).toBe(2);
  });
});

describe("resolveSubmissionListPageLoad", () => {
  it("returns notFound when the list Result is 404", () => {
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        submissionsResult: Result.error("missing", undefined, "NotFound", {
          statusCode: 404,
        }),
      }),
    );

    expect(outcome).toEqual({ kind: "notFound" });
  });

  it("returns error when the list Result fails without 404", () => {
    const listError = Result.error("Network down", undefined, "network_error", {
      statusCode: 503,
      traceId: "00-abc",
    });
    if (!Result.isError(listError)) {
      throw new Error("expected error");
    }

    const outcome = resolveSubmissionListPageLoad(
      successInput({ submissionsResult: listError }),
    );

    expect(outcome).toEqual({ kind: "error", result: listError });
  });

  it("returns notFound when fields Result is 404 after a successful list", () => {
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        fieldsResult: Result.error("gone", undefined, "NotFound", {
          statusCode: 404,
        }),
      }),
    );

    expect(outcome).toEqual({ kind: "notFound" });
  });

  it("returns fields error when fields fail without 404", () => {
    const fieldsError = Result.error("fields boom", undefined, "ServerError", {
      statusCode: 500,
    });
    if (!Result.isError(fieldsError)) {
      throw new Error("expected error");
    }

    const outcome = resolveSubmissionListPageLoad(
      successInput({ fieldsResult: fieldsError }),
    );

    expect(outcome).toEqual({ kind: "error", result: fieldsError });
  });

  it("returns redirect when the requested page is past totalPages", () => {
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        listState: { ...baseListState, page: 5 },
        submissionsResult: Result.success(
          pagedResponse({ page: 1, totalPages: 2, totalRecords: 40 }),
        ),
      }),
    );

    expect(outcome.kind).toBe("redirect");
    if (outcome.kind !== "redirect") {
      return;
    }
    expect(outcome.href).toContain("/forms/42/submissions");
    expect(outcome.href).toContain("page=2");
  });

  it("returns ready with list totals when filters are inactive", () => {
    const fields: DefinitionField[] = [
      { name: "q1", title: "Q1", type: "text" },
    ];
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        fieldsResult: Result.success(fields),
        useReportingExport: true,
        submissionsResult: Result.success(
          pagedResponse({ totalRecords: 3, totalPages: 1 }),
        ),
      }),
    );

    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") {
      return;
    }
    expect(outcome.model.hasAnySubmissions).toBe(true);
    expect(outcome.model.useReportingExport).toBe(true);
    expect(outcome.model.definitionFields).toEqual(fields);
    expect(outcome.model.page.totalRecords).toBe(3);
    expect(outcome.model.page.items).toHaveLength(1);
    expect(outcome.model.listState.page).toBe(1);
  });

  it("uses the unfiltered probe for hasAnySubmissions when filters are active", () => {
    const emptyFiltered = pagedResponse({
      items: [],
      totalRecords: 0,
      totalPages: 0,
    });
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        hasActiveFilters: true,
        submissionsResult: Result.success(emptyFiltered),
        probeResult: ApiResult.success(
          pagedResponse({ totalRecords: 12, totalPages: 1 }),
        ),
      }),
    );

    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") {
      return;
    }
    expect(outcome.model.hasAnySubmissions).toBe(true);
    expect(outcome.model.page.items).toHaveLength(0);
  });

  it("treats a failed probe as no submissions when filters are active", () => {
    const outcome = resolveSubmissionListPageLoad(
      successInput({
        hasActiveFilters: true,
        submissionsResult: Result.success(
          pagedResponse({ items: [], totalRecords: 0, totalPages: 0 }),
        ),
        probeResult: ApiResult.networkError("probe failed"),
      }),
    );

    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") {
      return;
    }
    expect(outcome.model.hasAnySubmissions).toBe(false);
  });
});
