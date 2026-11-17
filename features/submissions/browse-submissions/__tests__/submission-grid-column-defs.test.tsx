import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
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
  const Header = definition.header as (props: {
    column: unknown;
  }) => React.ReactNode;
  const tableColumn = {
    id: definition.id,
    getCanSort: () => false,
    getIsSorted: () => false,
  };
  render(<Header column={tableColumn} />);
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
    expect(screen.getByRole("button", { name: /refresh/i })).toBeTruthy();
    expect(screen.queryByPlaceholderText("text:city")).toBeNull();
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

/** Renders the header of the one answer column. */
function renderAnswerHeader(column: SubmissionGridColumn) {
  const [definition] = buildSubmissionGridColumns(
    toAnswerColumns([column]),
    FILTERS,
  ).slice(-1);
  const Header = definition.header as (props: {
    column: unknown;
  }) => React.ReactNode;
  render(
    <Header
      column={{
        id: definition.id,
        getCanSort: () => false,
        getIsSorted: () => false,
      }}
    />,
  );
}

const FORMATTED_TITLE =
  'Which brands of <span style="color:#09f">{category}</span> do you know? <em>Select all.</em>';
const PLAIN_TITLE = "Which brands of {category} do you know? Select all.";

describe("answer column header label", () => {
  beforeEach(() => {
    stubResizeObserver();
  });

  it("shows the question name and describes it with the plain title", () => {
    renderAnswerHeader(
      wireColumn("brands__Alpha", "ChoiceIndicator", {
        title: FORMATTED_TITLE,
      }),
    );

    const label = screen.getByRole("button", { name: "brands__Alpha" });
    expect(label.textContent).toBe("brands__Alpha");
    const descriptionId = label.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      PLAIN_TITLE,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reveals the plain title on keyboard focus", async () => {
    renderAnswerHeader(
      wireColumn("QAIDED", "Simple", { title: FORMATTED_TITLE }),
    );

    const label = screen.getByRole("button", { name: "QAIDED" });
    fireEvent.focus(label);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe(`QAIDED — ${PLAIN_TITLE}`);
    expect(label.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("reveals the plain title on a tap", async () => {
    renderAnswerHeader(
      wireColumn("QAIDED", "Simple", { title: FORMATTED_TITLE }),
    );
    const label = screen.getByRole("button", { name: "QAIDED" });

    fireEvent.pointerDown(label, { pointerType: "touch" });
    fireEvent.click(label);

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      `QAIDED — ${PLAIN_TITLE}`,
    );
  });

  it("shows only the name when the question has no title", () => {
    renderAnswerHeader(wireColumn("q1", "Simple", { title: "" }));

    expect(screen.getByText("q1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "q1" })).toBeNull();
  });

  it("keeps the title of a submitter profile column", () => {
    renderAnswerHeader(
      wireColumn("submitter_city", "SubmitterProfile", {
        title: "City",
      }),
    );

    expect(screen.getByText("City")).toBeTruthy();
    expect(screen.queryByText("submitter_city")).toBeNull();
  });
});
