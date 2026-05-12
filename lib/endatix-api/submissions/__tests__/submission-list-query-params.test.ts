import { describe, expect, it } from "vitest";
import {
  SUBMISSION_LIST_FILTER_FIELD_NAMES,
  SUBMISSION_LIST_FILTER_QUERY_PARAM,
  appendSubmissionListFilters,
  utcCalendarDayStartIso,
  utcCalendarNextDayStartIso,
} from "../submission-list-query-params";

const F = SUBMISSION_LIST_FILTER_FIELD_NAMES;

describe("utcCalendarDayStartIso", () => {
  it("returns UTC midnight ISO for calendar date", () => {
    expect(utcCalendarDayStartIso("2024-06-15")).toBe(
      "2024-06-15T00:00:00.000Z",
    );
  });
});

describe("utcCalendarNextDayStartIso", () => {
  it("returns start of next calendar day in UTC", () => {
    expect(utcCalendarNextDayStartIso("2024-06-15")).toBe(
      "2024-06-16T00:00:00.000Z",
    );
  });

  it("rolls from year end to January in UTC", () => {
    expect(utcCalendarNextDayStartIso("2024-12-31")).toBe(
      "2025-01-01T00:00:00.000Z",
    );
  });
});

describe("appendSubmissionListFilters", () => {
  it("does not append filter params when no filter fields are set", () => {
    const params = new URLSearchParams();
    appendSubmissionListFilters(params, { page: 2, pageSize: 20 });
    expect(params.has(SUBMISSION_LIST_FILTER_QUERY_PARAM)).toBe(false);
  });

  it("appends filter segments and uses UTC calendar boundaries for dates", () => {
    const params = new URLSearchParams();
    appendSubmissionListFilters(params, {
      isComplete: ["true"],
      status: ["new", "read"],
      isTestSubmission: ["false"],
      createdAtFrom: "2024-01-10",
      createdAtTo: "2024-01-12",
      completedAtFrom: "2024-02-01",
      completedAtTo: "2024-02-02",
    });

    const filters = params.getAll(SUBMISSION_LIST_FILTER_QUERY_PARAM);
    expect(filters).toContain(`${F.isComplete}:true`);
    expect(filters).toContain(`${F.status}:new|read`);
    expect(filters).toContain(`${F.isTestSubmission}:false`);
    expect(filters).toContain(
      `${F.createdAt}>:${utcCalendarDayStartIso("2024-01-10")}`,
    );
    expect(filters).toContain(
      `${F.createdAt}<${utcCalendarNextDayStartIso("2024-01-12")}`,
    );
    expect(filters).toContain(
      `${F.completedAt}>:${utcCalendarDayStartIso("2024-02-01")}`,
    );
    expect(filters).toContain(
      `${F.completedAt}<${utcCalendarNextDayStartIso("2024-02-02")}`,
    );
  });
});
