import { describe, expect, it, vi } from "vitest";
import type { EndatixApi } from "../../endatix-api";
import { ApiResult } from "../../shared/api-result";
import type { Submission } from "../../submissions/types";
import {
  buildListSubmissionGridColumnsEndpoint,
  buildListSubmissionGridRowsEndpoint,
  SubmissionGrid,
} from "../submission-grid";
import { toSubmissionGridRow } from "../submission-grid-rows-from-submissions";

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "9007199254740993",
    formId: "1",
    formDefinitionId: "2",
    isComplete: false,
    jsonData: JSON.stringify({ q1: "Yes", q2: ["a", "b"], other: 1 }),
    currentPage: 0,
    metadata: "{}",
    token: "",
    status: "draft",
    createdAt: "2026-10-01T10:00:00Z" as unknown as Date,
    ...overrides,
  };
}

describe("buildListSubmissionGridColumnsEndpoint", () => {
  it("sends the locale when given", () => {
    expect(buildListSubmissionGridColumnsEndpoint("5", { locale: "de" })).toBe(
      "/forms/5/reporting/columns?locale=de",
    );
  });

  it("omits the locale by default", () => {
    expect(buildListSubmissionGridColumnsEndpoint("5")).toBe(
      "/forms/5/reporting/columns",
    );
  });
});

describe("buildListSubmissionGridRowsEndpoint", () => {
  it("sends the list query plus the requested columns", () => {
    // Act
    const endpoint = buildListSubmissionGridRowsEndpoint("5", {
      page: 2,
      pageSize: 20,
      sortBy: "createdAt",
      sortDir: "desc",
      status: ["new"],
      createdFrom: "2026-01-01",
      columns: ["q1", "q2"],
    });

    // Assert
    const query = new URL(endpoint, "https://hub.test").searchParams;
    expect(endpoint.startsWith("/forms/5/reporting/submissions?")).toBe(true);
    expect(Object.fromEntries(query)).toEqual({
      page: "2",
      pageSize: "20",
      filter: "status:new",
      sortBy: "createdAt",
      sortDir: "desc",
      createdFrom: "2026-01-01",
      columns: "q1,q2",
    });
  });

  it("sends one answer param per filter with the key percent-encoded", () => {
    // Act
    const endpoint = buildListSubmissionGridRowsEndpoint("5", {
      columns: [],
      answerFilters: [
        { operator: "contains", key: "panel:name", value: "a:b c" },
        { operator: "from", key: "born", value: "2026-01-01" },
      ],
    });

    // Assert
    const query = new URL(endpoint, "https://hub.test").searchParams;
    expect(query.getAll("answer")).toEqual([
      "contains:panel%3Aname:a:b c",
      "from:born:2026-01-01",
    ]);
  });

  it("asks for no answers when no column is visible", () => {
    expect(buildListSubmissionGridRowsEndpoint("5", { columns: [] })).toBe(
      "/forms/5/reporting/submissions?page=1&pageSize=10",
    );
  });
});

describe("toSubmissionGridRow", () => {
  it("picks the requested answers from raw data and keeps ids as strings", () => {
    // Act
    const row = toSubmissionGridRow(submission(), ["q2", "q1", "missing"]);

    // Assert
    expect(row).toMatchObject({
      id: "9007199254740993",
      answers: { q1: "Yes", q2: ["a", "b"] },
      answersSource: "raw",
      rowState: "none",
      createdAt: "2026-10-01T10:00:00Z",
    });
    expect(row.answers).not.toHaveProperty("missing");
  });

  it("returns no answers for unreadable data", () => {
    expect(
      toSubmissionGridRow(submission({ jsonData: "{oops" }), ["q1"]).answers,
    ).toEqual({});
  });
});

describe("SubmissionGrid", () => {
  it("rejects a form id that is not an Endatix id before calling the API", async () => {
    // Arrange
    const get = vi.fn();
    const grid = new SubmissionGrid({ get } as unknown as EndatixApi);

    // Act
    const result = await grid.listColumns("abc");

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("reads rows from the reporting rows endpoint", async () => {
    // Arrange
    const page = {
      items: [],
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    };
    const get = vi.fn().mockResolvedValue(ApiResult.success(page));
    const list = vi.fn();
    const grid = new SubmissionGrid({
      get,
      submissions: { list },
    } as unknown as EndatixApi);

    // Act
    const result = await grid.listRows("5", { columns: ["q1"] });

    // Assert
    expect(get).toHaveBeenCalledWith(
      "/forms/5/reporting/submissions?page=1&pageSize=10&columns=q1",
    );
    expect(list).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result) && result.data.hasNextPage).toBe(false);
  });

  it("builds rows from the submissions list when the rows endpoint answers 404", async () => {
    // Arrange
    const get = vi.fn().mockResolvedValue(ApiResult.notFoundError("Not found"));
    const list = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: [submission()],
        page: 1,
        pageSize: 10,
        totalRecords: 1,
        totalPages: 1,
      }),
    );
    const grid = new SubmissionGrid({
      get,
      submissions: { list },
    } as unknown as EndatixApi);

    // Act
    const result = await grid.listRows("5", { columns: ["q1"] });

    // Assert
    expect(list).toHaveBeenCalledWith("5", { columns: ["q1"] });
    expect(ApiResult.isSuccess(result) && result.data.items[0].answers).toEqual(
      { q1: "Yes" },
    );
  });

  it("keeps the answer filter coverage of the page", async () => {
    // Arrange
    const coverage = { uncheckedCompleted: 3, uncheckedInProgress: 1 };
    const get = vi.fn().mockResolvedValue(
      ApiResult.success({
        items: [],
        page: 1,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0,
        answerFilterCoverage: coverage,
      }),
    );
    const grid = new SubmissionGrid({ get } as unknown as EndatixApi);

    // Act
    const result = await grid.listRows("5", { columns: [] });

    // Assert
    expect(
      ApiResult.isSuccess(result) && result.data.answerFilterCoverage,
    ).toEqual(coverage);
  });

  it("does not fall back to the submissions list with answer filters", async () => {
    // Arrange
    const get = vi.fn().mockResolvedValue(ApiResult.notFoundError("Not found"));
    const list = vi.fn();
    const grid = new SubmissionGrid({
      get,
      submissions: { list },
    } as unknown as EndatixApi);

    // Act
    const result = await grid.listRows("5", {
      columns: [],
      answerFilters: [{ operator: "contains", key: "q1", value: "x" }],
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(false);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns other failures without falling back", async () => {
    // Arrange
    const get = vi.fn().mockResolvedValue(ApiResult.serverError("Boom"));
    const list = vi.fn();
    const grid = new SubmissionGrid({
      get,
      submissions: { list },
    } as unknown as EndatixApi);

    // Act
    const result = await grid.listRows("5", { columns: [] });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(false);
    expect(list).not.toHaveBeenCalled();
  });
});
