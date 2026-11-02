import { describe, expect, it } from "vitest";
import { exportFiltersFromGrid } from "../submission-grid-export-filters";
import { parseSubmissionGridUrl } from "../submission-grid-url";

describe("exportFiltersFromGrid", () => {
  it("names answer filters as ones an export cannot apply", () => {
    // Arrange
    const state = parseSubmissionGridUrl({ "answer.contains.q1": "acme" });

    // Act
    const filters = exportFiltersFromGrid(state);

    // Assert
    expect(filters.tableOnlyFilters).toEqual(["Answers"]);
  });

  it("names nothing without table-only filters", () => {
    expect(
      exportFiltersFromGrid(parseSubmissionGridUrl({})).tableOnlyFilters,
    ).toBeUndefined();
  });
});
