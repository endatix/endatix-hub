import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SubmissionGridColumn,
  SubmissionGridRow,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { toAnswerColumns, type AnswerColumn } from "../submission-grid-columns";
import { SubmissionGridTable } from "../ui/submission-grid-table";
import { SubmissionGridUrlProvider } from "../ui/submission-grid-url-context";

const searchParams = vi.hoisted(() => new URLSearchParams());
const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/forms/7/submissions",
  useSearchParams: () => searchParams,
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));

function row(overrides: Partial<SubmissionGridRow> = {}): SubmissionGridRow {
  return {
    id: "9007199254740993",
    formId: "7",
    formDefinitionId: "2",
    isComplete: true,
    collectionStatus: "complete",
    status: "new",
    submitterDisplayId: "visitor-1",
    createdAt: "2026-10-01T10:00:00Z",
    rowState: "prepared",
    answers: {},
    answersSource: "prepared",
    ...overrides,
  };
}

function renderTable(
  rows: SubmissionGridRow[],
  answerColumns: AnswerColumn[] = [],
) {
  const page = normalizePagedResponse({
    items: rows,
    page: 1,
    pageSize: 10,
    totalRecords: rows.length,
    totalPages: 1,
  });
  return render(
    <SubmissionGridUrlProvider catalog={answerColumns}>
      <SubmissionGridTable
        page={page}
        answerColumns={answerColumns}
        submitterLabel="Submitter"
      />
    </SubmissionGridUrlProvider>,
  );
}

describe("SubmissionGridTable", () => {
  beforeEach(() => router.push.mockClear());

  it("opens the submission when its row is clicked", () => {
    // Arrange
    renderTable([row()]);

    // Act
    fireEvent.click(screen.getByText("Complete"));

    // Assert
    expect(router.push).toHaveBeenCalledWith(
      "/forms/7/submissions/9007199254740993",
      { scroll: false },
    );
  });

  it("does not open the submission from the row menu", () => {
    // Arrange
    renderTable([row()]);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Submission actions" }));

    // Assert
    expect(router.push).not.toHaveBeenCalled();
  });
});

function wireColumn(
  overrides: Partial<SubmissionGridColumn> & { key: string },
): SubmissionGridColumn {
  return {
    kind: "Simple",
    title: overrides.key,
    questionType: "text",
    filterType: "text",
    pageName: null,
    pageTitle: null,
    panelTitle: null,
    ...overrides,
  };
}

function openColumnMenu(title: string) {
  fireEvent.keyDown(
    screen.getByRole("button", { name: `${title} column menu` }),
    { key: "Enter" },
  );
}

function replacedQuery(): URLSearchParams {
  const [href] = router.replace.mock.calls.at(-1) as [string];
  return new URL(href, "https://hub.test").searchParams;
}

describe("SubmissionGridTable answer filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    router.replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes a text column's contains filter to the URL", () => {
    // Arrange
    renderTable([row()], toAnswerColumns([wireColumn({ key: "company" })]));
    openColumnMenu("company");

    // Act
    fireEvent.change(screen.getByPlaceholderText("Contains"), {
      target: { value: "acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    act(() => vi.advanceTimersByTime(350));

    // Assert
    expect(replacedQuery().get("answer.contains.company")).toBe("acme");
  });

  it("writes a date column's From and To from the first page", () => {
    // Arrange
    renderTable(
      [row()],
      toAnswerColumns([wireColumn({ key: "born", filterType: "date" })]),
    );
    openColumnMenu("born");

    // Act
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-01-01" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-01-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    // Assert
    const query = replacedQuery();
    expect(query.get("answer.from.born")).toBe("2026-01-01");
    expect(query.get("answer.to.born")).toBe("2026-01-31");
    expect(query.has("page")).toBe(false);
  });

  it("says a dropdown matches the stored choice value", () => {
    // Arrange
    renderTable(
      [row()],
      toAnswerColumns([wireColumn({ key: "plan", questionType: "dropdown" })]),
    );

    // Act
    openColumnMenu("plan");

    // Assert
    expect(
      screen.getByPlaceholderText("Contains (stored choice value)"),
    ).toBeTruthy();
  });

  it.each([
    ["a column without a filter type", { key: "likes", filterType: null }],
    [
      "a column the API marks not searchable",
      { key: "notes", searchable: false },
    ],
    ["a submitter column", { key: "submitter_name", kind: "SubmitterProfile" }],
  ])("offers no answer filter on %s", (_, column) => {
    // Arrange & Act
    renderTable([row()], toAnswerColumns([wireColumn(column)]));

    // Assert
    expect(
      screen.queryByRole("button", { name: `${column.key} column menu` }),
    ).toBeNull();
  });

  it("keeps the submitter email filter on the email column", () => {
    // Arrange
    renderTable(
      [row()],
      toAnswerColumns([
        wireColumn({ key: "submitter_email", kind: "SubmitterProfile" }),
      ]),
    );

    // Act
    openColumnMenu("submitter_email");

    // Assert
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
  });
});
