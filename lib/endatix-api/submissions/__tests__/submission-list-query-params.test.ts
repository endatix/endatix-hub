import { describe, expect, it } from "vitest";
import {
  SUBMISSION_LIST_FILTER_FIELD_NAMES,
  SUBMISSION_LIST_FILTER_QUERY_PARAM,
  appendSubmissionListFilters,
} from "../submission-list-query-params";

const F = SUBMISSION_LIST_FILTER_FIELD_NAMES;

describe("appendSubmissionListFilters", () => {
  it("does not append filter params when no filter fields are set", () => {
    const params = new URLSearchParams();
    appendSubmissionListFilters(params, { page: 2, pageSize: 20 });
    expect(params.has(SUBMISSION_LIST_FILTER_QUERY_PARAM)).toBe(false);
  });

  it("appends facet filter segments and typed date/sort query params", () => {
    const params = new URLSearchParams();
    appendSubmissionListFilters(params, {
      isComplete: ["true"],
      status: ["new", "read"],
      isTestSubmission: ["false"],
      sortBy: "createdAt",
      sortDir: "asc",
      createdFrom: "2024-01-10",
      createdTo: "2024-01-12",
      modifiedFrom: "2024-01-15",
      modifiedTo: "2024-01-16",
      completedFrom: "2024-02-01",
      completedTo: "2024-02-02",
    });

    const filters = params.getAll(SUBMISSION_LIST_FILTER_QUERY_PARAM);
    expect(filters).toContain(`${F.isComplete}:true`);
    expect(filters).toContain(`${F.status}:new|read`);
    expect(filters).toContain(`${F.isTestSubmission}:false`);
    expect(filters.some((f) => f.includes("createdAt"))).toBe(false);

    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortDir")).toBe("asc");
    expect(params.get("createdFrom")).toBe("2024-01-10");
    expect(params.get("createdTo")).toBe("2024-01-12");
    expect(params.get("modifiedFrom")).toBe("2024-01-15");
    expect(params.get("modifiedTo")).toBe("2024-01-16");
    expect(params.get("completedFrom")).toBe("2024-02-01");
    expect(params.get("completedTo")).toBe("2024-02-02");
  });

  it("skips date params that are not valid YYYY-MM-DD calendar days", () => {
    const params = new URLSearchParams();
    appendSubmissionListFilters(params, {
      isComplete: ["true"],
      createdFrom: "not-a-date",
      createdTo: "2024-13-40",
      completedFrom: "2024-02-30",
      completedTo: "2024-06-15",
    });

    const filters = params.getAll(SUBMISSION_LIST_FILTER_QUERY_PARAM);
    expect(filters).toContain(`${F.isComplete}:true`);
    expect(params.has("createdFrom")).toBe(false);
    expect(params.has("createdTo")).toBe(false);
    expect(params.has("completedFrom")).toBe(false);
    expect(params.get("completedTo")).toBe("2024-06-15");
  });

  it("appends allowed submitter profile filters with normalized field names", () => {
    const params = new URLSearchParams();

    appendSubmissionListFilters(params, {
      submitterProfileFilter: {
        field: " Email ",
        value: " panelist@example.com ",
      },
    });

    expect(params.getAll(SUBMISSION_LIST_FILTER_QUERY_PARAM)).toEqual([
      `${F.submitterProfile}.email:panelist@example.com`,
    ]);
  });

  it("skips submitter profile filters with unsupported field names", () => {
    const params = new URLSearchParams();

    appendSubmissionListFilters(params, {
      submitterProfileFilter: {
        field: "email:admin|status",
        value: "panelist@example.com",
      },
    });

    expect(params.has(SUBMISSION_LIST_FILTER_QUERY_PARAM)).toBe(false);
  });
});
