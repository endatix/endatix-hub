import { describe, expect, it, vi } from "vitest";
import type { SubmissionGridColumn } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  SUBMISSION_GRID_METADATA_COLUMN_IDS,
  toAnswerColumns,
} from "../submission-grid-columns";
import {
  buildSubmissionGridColumns,
  type SubmissionGridColumnFilters,
} from "../ui/submission-grid-column-defs";

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));

const FILTERS: SubmissionGridColumnFilters = {
  dates: { created: {}, modified: {}, started: {}, completed: {} },
  onDateChange: vi.fn(),
  submitterDisplayId: {
    value: "",
    placeholder: "Submitter",
    onChange: vi.fn(),
  },
  submitterEmail: { value: "", placeholder: "Email", onChange: vi.fn() },
};

function wireColumn(key: string, kind = "Simple"): SubmissionGridColumn {
  return {
    key,
    kind,
    title: key,
    questionType: null,
    filterType: null,
    pageName: null,
    pageTitle: null,
    panelTitle: null,
  };
}

describe("buildSubmissionGridColumns", () => {
  it("puts the metadata columns first and the answers in view order", () => {
    // Arrange
    const answers = toAnswerColumns([wireColumn("q2"), wireColumn("q1")]);

    // Act
    const ids = buildSubmissionGridColumns(answers, FILTERS).map(
      (column) => column.id,
    );

    // Assert
    expect(ids).toEqual([
      "actions",
      ...SUBMISSION_GRID_METADATA_COLUMN_IDS,
      "answer:q2",
      "answer:q1",
    ]);
  });

  it("sorts only the columns the API can sort by", () => {
    // Act
    const sortable = buildSubmissionGridColumns(
      toAnswerColumns([wireColumn("q1")]),
      FILTERS,
    )
      .filter((column) => column.enableSorting)
      .map((column) => column.id);

    // Assert
    expect(sortable).toEqual([
      "modifiedAt",
      "startedAt",
      "completedAt",
      "createdAt",
    ]);
  });
});
