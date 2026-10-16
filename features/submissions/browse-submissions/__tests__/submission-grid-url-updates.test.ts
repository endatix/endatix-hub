import { describe, expect, it } from "vitest";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import {
  answerDateRangeUpdate,
  clearFiltersUpdate,
  dateFiltersByStem,
  dateRangeUpdate,
  facetUpdate,
  hasActiveFilters,
  sortingFromUrlState,
  sortUpdate,
} from "../submission-grid-url-updates";

describe("submission grid URL updates", () => {
  it("starts a facet change from the first page", () => {
    expect(facetUpdate("status", new Set(["new", "read"]))).toEqual({
      status: "new,read",
      page: null,
    });
  });

  it("clears a facet with no values", () => {
    expect(facetUpdate("status", [])).toEqual({ status: null, page: null });
  });

  it("writes both bounds of a date filter", () => {
    expect(dateRangeUpdate("created", { from: "2026-01-01" })).toEqual({
      createdFrom: "2026-01-01",
      createdTo: null,
      page: null,
    });
  });

  it("writes only a sortable column", () => {
    // Act & Assert
    expect(sortUpdate([{ id: "createdAt", desc: true }])).toEqual({
      sort: "createdAt:desc",
    });
    expect(sortUpdate([{ id: "answer:q1", desc: true }])).toEqual({
      sort: null,
    });
  });

  it("reads the URL sort back as table sorting", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ sort: "startedAt:asc" });

    // Act & Assert
    expect(sortingFromUrlState(state)).toEqual([
      { id: "startedAt", desc: false },
    ]);
  });

  it("groups date bounds by column", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ completedTo: "2026-03-01" });

    // Act & Assert
    expect(dateFiltersByStem(state).completed).toEqual({
      from: undefined,
      to: "2026-03-01",
    });
  });

  it("clears every filter but keeps sort and columns", () => {
    // Act
    const update = clearFiltersUpdate(parseSubmissionGridUrl({}));

    // Assert
    expect(update).toMatchObject({
      collectionStatus: null,
      submitterEmail: null,
      completedTo: null,
      page: null,
    });
    expect(update).not.toHaveProperty("sort");
    expect(update).not.toHaveProperty("columns");
  });

  it("clears the answer filters too, hidden columns' included", () => {
    // Arrange
    const state = parseSubmissionGridUrl({
      "answer.contains.q1": "acme",
      "answer.to.born": "2026-01-31",
    });

    // Act
    const update = clearFiltersUpdate(state);

    // Assert
    expect(update).toMatchObject({
      "answer.contains.q1": null,
      "answer.to.born": null,
    });
  });

  it("writes both bounds of a date answer filter", () => {
    expect(answerDateRangeUpdate("born", { to: "2026-01-31" })).toEqual({
      "answer.from.born": null,
      "answer.to.born": "2026-01-31",
      page: null,
    });
  });

  it.each([
    [{}, false],
    [{ sort: "createdAt:asc" }, false],
    [{ modifiedFrom: "2026-01-01" }, true],
    [{ submitterDisplayId: "abc" }, true],
    [{ "answer.contains.q1": "acme" }, true],
  ])("reports active filters for %j as %s", (raw, expected) => {
    expect(hasActiveFilters(parseSubmissionGridUrl(raw))).toBe(expected);
  });
});
