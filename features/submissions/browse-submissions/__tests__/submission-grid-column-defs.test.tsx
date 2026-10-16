import { fireEvent, render, screen } from "@testing-library/react";
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
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const FILTERS: SubmissionGridColumnFilters = {
  dates: { created: {}, modified: {}, started: {}, completed: {} },
  onDateChange: vi.fn(),
  submitterDisplayId: {
    value: "",
    placeholder: "Submitter",
    onChange: vi.fn(),
  },
  submitterEmail: { value: "", placeholder: "Email", onChange: vi.fn() },
  answerText: (column) => ({
    value: "",
    placeholder: `text:${column.key}`,
    onChange: vi.fn(),
  }),
  answerDate: () => ({ value: {}, onChange: vi.fn() }),
};

function wireColumn(
  key: string,
  kind = "Simple",
  overrides: Partial<SubmissionGridColumn> = {},
): SubmissionGridColumn {
  return {
    key,
    kind,
    title: key,
    questionType: null,
    filterType: null,
    pageName: null,
    pageTitle: null,
    panelTitle: null,
    ...overrides,
  };
}

/** Renders the header of the one answer column and opens its menu. */
function openAnswerHeaderMenu(column: SubmissionGridColumn) {
  const [definition] = buildSubmissionGridColumns(
    toAnswerColumns([column]),
    FILTERS,
  ).slice(-1);
  const Header = definition.header as (props: unknown) => React.ReactNode;
  const tableColumn = {
    id: definition.id,
    getCanSort: () => false,
    getIsSorted: () => false,
  };
  render(<>{Header({ column: tableColumn })}</>);
  fireEvent.pointerDown(screen.getByRole("button", { name: /column menu/i }), {
    button: 0,
    ctrlKey: false,
  });
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

describe("answer column header filters", () => {
  it("shows a preparing note instead of inputs while the search copy rebuilds", () => {
    // Act
    openAnswerHeaderMenu(
      wireColumn("city", "Simple", {
        filterType: "text",
        searchPending: true,
        searchSource: "user",
      }),
    );

    // Assert
    expect(screen.getByText(/this filter is being prepared/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /check again/i })).toBeTruthy();
    expect(screen.queryByLabelText("Filter")).toBeNull();
  });

  it("shows the text filter once the column is ready", () => {
    // Act
    openAnswerHeaderMenu(
      wireColumn("city", "Simple", { filterType: "text", searchable: true }),
    );

    // Assert
    expect(screen.getByPlaceholderText("text:city")).toBeTruthy();
    expect(screen.queryByText(/this filter is being prepared/i)).toBeNull();
  });
});
