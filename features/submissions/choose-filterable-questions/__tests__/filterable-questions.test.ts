import { describe, expect, it } from "vitest";
import type { SubmissionGridColumn } from "@/lib/endatix-api/reporting/submission-grid-types";
import { listFilterableQuestions } from "../filterable-questions";

function wireColumn(
  overrides: Partial<SubmissionGridColumn> = {},
): SubmissionGridColumn {
  return {
    key: "q1",
    kind: "Simple",
    title: "Question one",
    questionType: "text",
    filterType: "text",
    pageName: null,
    pageTitle: null,
    panelTitle: null,
    ...overrides,
  };
}

describe("listFilterableQuestions", () => {
  it("lists the search keys in schema order, automatic and chosen", () => {
    // Arrange
    const columns = [
      wireColumn({
        key: "a",
        title: "A",
        searchable: true,
        searchSource: "auto",
      }),
      wireColumn({ key: "b", searchable: false, searchSource: null }),
      wireColumn({
        key: "c",
        title: "",
        searchable: true,
        searchPending: true,
        searchSource: "user",
      }),
    ];

    // Act
    const questions = listFilterableQuestions(columns);

    // Assert
    expect(questions).toEqual([
      { key: "a", title: "A", source: "auto", preparing: false },
      { key: "c", title: "c", source: "user", preparing: true },
    ]);
  });
});
