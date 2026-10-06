import { describe, expect, it } from "vitest";
import {
  includeTestSubmissionsFromGridFilter,
  submissionExportListFilters,
} from "../../ui/submission-export-list-filters";

const noDates = {
  createdAt: {},
  modifiedAt: {},
  startedAt: {},
  completedAt: {},
};

function prefill(
  overrides: Partial<Parameters<typeof submissionExportListFilters>[0]> = {},
) {
  return submissionExportListFilters({
    dates: noDates,
    collectionStatus: [],
    testSubmission: [],
    review: [],
    submitterFiltered: false,
    ...overrides,
  });
}

describe("submissionExportListFilters", () => {
  it("sends the list's Status codes as they are, and none when the facet is empty", () => {
    // Act & Assert
    expect(
      prefill({ collectionStatus: ["in_progress"] }).collectionStatus,
    ).toEqual(["in_progress"]);
    expect(prefill().collectionStatus).toBeUndefined();
  });

  it("names no table-only filter when every active filter can be exported", () => {
    // Act
    const filters = prefill({
      collectionStatus: ["complete"],
      testSubmission: ["false"],
    });

    // Assert
    expect(filters.tableOnlyFilters).toBeUndefined();
    expect(filters.includeTestSubmissions).toBe(false);
  });

  it("names Review, Submitter and a test-only Submission Type, in toolbar order", () => {
    // Act
    const filters = prefill({
      review: ["new"],
      submitterFiltered: true,
      testSubmission: ["true"],
    });

    // Assert
    expect(filters.tableOnlyFilters).toEqual([
      "Review",
      "Submitter",
      "Submission Type",
    ]);
  });

  it("does not name Submission Type when both types are selected", () => {
    // Act
    const filters = prefill({ testSubmission: ["true", "false"] });

    // Assert
    expect(filters.tableOnlyFilters).toBeUndefined();
  });

  it("maps the grid test filter onto Include test submissions", () => {
    // Act & Assert
    expect(includeTestSubmissionsFromGridFilter([])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["false"])).toBe(false);
    expect(includeTestSubmissionsFromGridFilter(["true"])).toBe(true);
    expect(includeTestSubmissionsFromGridFilter(["true", "false"])).toBe(true);
  });
});
