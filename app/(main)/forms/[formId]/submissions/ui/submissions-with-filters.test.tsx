import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PaginationState, Updater } from "@tanstack/react-table";
import type { Submission } from "@/lib/endatix-api/submissions/types";
import { SubmissionsWithFilters } from "./submissions-with-filters";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/forms/form-1/submissions",
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

vi.mock("@/features/forms/ui/share-dialog", () => ({
  ShareDialog: ({ open }: { open: boolean }) =>
    open ? <div>Share dialog</div> : null,
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  unstable_update: vi.fn(),
}));

vi.mock(
  "@/features/forms/application/actions/get-tenant-settings.action",
  () => ({
    getTenantSettingsAction: vi.fn(),
  }),
);

vi.mock("@/features/submissions/ui/export", () => ({
  ExportSubmissionsButton: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Export Submissions</button>
  ),
}));

vi.mock("@/features/submissions/ui/table", () => ({
  buildSubmissionDataColumns: () => [],
  buildSubmissionSystemColumns: ({
    dateFilters,
    onDateFilterChange,
  }: {
    dateFilters?: {
      createdAt: { from?: string; to?: string };
      completedAt: { from?: string; to?: string };
    };
    onDateFilterChange?: (
      columnId: "createdAt" | "completedAt",
      value: { from?: string; to?: string },
    ) => void;
  } = {}) => [
    {
      id: "createdAt",
      meta: {
        displayName: "Created at",
        testDateFilter: dateFilters?.createdAt,
        testOnDateFilterChange: onDateFilterChange,
      },
    },
    {
      id: "completedAt",
      meta: {
        displayName: "Completed at",
        testDateFilter: dateFilters?.completedAt,
        testOnDateFilterChange: onDateFilterChange,
      },
    },
  ],
  COLUMNS_DEFINITION: [
    {
      id: "createdAt",
      meta: {
        displayName: "Created at",
      },
    },
  ],
  EMPTY_SUBMISSION_DATE_FILTERS: {
    createdAt: {},
    completedAt: {},
  },
  ColumnOrderProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  ColumnVisibilityProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  ColumnViewOptionsDropdown: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>View</button>
  ),
  ResetOptionsDropdown: () => null,
  useColumnOrder: () => ({
    resetToDefault: vi.fn(),
    hasCustomOrder: false,
  }),
  useColumnVisibility: () => ({
    resetToDefault: vi.fn(),
    hasCustomVisibility: false,
  }),
}));

vi.mock("./submissions-table", () => ({
  default: ({
    data,
    columns,
    onPaginationChange,
  }: {
    data: Submission[];
    columns: Array<{
      id: string;
      meta?: {
        testDateFilter?: { from?: string; to?: string };
        testOnDateFilterChange?: (
          columnId: "createdAt" | "completedAt",
          value: { from?: string; to?: string },
        ) => void;
      };
    }>;
    onPaginationChange?: (updater: Updater<PaginationState>) => void;
  }) => {
    const createdAtColumn = columns.find((column) => column.id === "createdAt");
    const completedAtColumn = columns.find(
      (column) => column.id === "completedAt",
    );

    return (
      <div data-testid="submissions-table">
        Rows: {data.length}
        <div>
          Created from: {createdAtColumn?.meta?.testDateFilter?.from ?? ""}
        </div>
        <div>
          Completed to: {completedAtColumn?.meta?.testDateFilter?.to ?? ""}
        </div>
        <button
          onClick={() => onPaginationChange?.({ pageIndex: 1, pageSize: 20 })}
        >
          Go page 2
        </button>
        <button
          onClick={() =>
            createdAtColumn?.meta?.testOnDateFilterChange?.("createdAt", {
              from: "2026-02-03",
            })
          }
        >
          Set created from
        </button>
        <button
          onClick={() =>
            completedAtColumn?.meta?.testOnDateFilterChange?.("completedAt", {
              to: "2026-03-04",
            })
          }
        >
          Set completed to
        </button>
      </div>
    );
  },
}));

const submission: Submission = {
  id: "sub-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  formId: "form-1",
  formDefinitionId: "definition-1",
  isComplete: true,
  isTestSubmission: false,
  jsonData: "{}",
  currentPage: 1,
  metadata: "{}",
  token: "token-1",
  completedAt: new Date("2026-01-01T00:02:00Z"),
  status: "completed",
};

const renderSubmissionsWithFilters = (
  props: Partial<React.ComponentProps<typeof SubmissionsWithFilters>> = {},
) =>
  render(
    <SubmissionsWithFilters
      data={[]}
      formId="form-1"
      hasAnySubmissions={false}
      initialPage={1}
      initialPageSize={10}
      totalRecords={0}
      totalPages={0}
      {...props}
    />,
  );

describe("SubmissionsWithFilters", () => {
  beforeEach(() => {
    navigationMocks.push.mockClear();
    localStorage.clear();
  });

  it("shows the true empty state when deep-linked filters exist but the form has no submissions", () => {
    // Act
    renderSubmissionsWithFilters({
      hasAnySubmissions: false,
      initialStatus: ["new"],
    });

    // Assert
    screen.getByText("No submissions yet");
    expect(screen.queryByText("No submissions match these filters")).toBeNull();
    expect(
      (screen.getByRole("button", { name: /status/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /export submissions/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows the filtered empty state when submissions exist but filters match no rows", () => {
    // Act
    renderSubmissionsWithFilters({
      hasAnySubmissions: true,
      initialStatus: ["new"],
      totalRecords: 2,
      totalPages: 1,
    });

    // Assert
    screen.getByText("No submissions match these filters");
    expect(screen.queryByText("No submissions yet")).toBeNull();

    const emptyState = screen
      .getByRole("heading", { name: "No submissions match these filters" })
      .closest("div");

    expect(emptyState).not.toBeNull();
    fireEvent.click(
      within(emptyState as HTMLElement).getByRole("button", {
        name: /reset filters/i,
      }),
    );

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions",
      { scroll: false },
    );
  });

  it("renders the table path when rows are available", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      hasAnySubmissions: true,
      totalRecords: 1,
      totalPages: 1,
    });

    // Assert
    screen.getByTestId("submissions-table");
    expect(screen.queryByText("No submissions yet")).toBeNull();
    expect(screen.queryByText("No submissions match these filters")).toBeNull();
  });

  it("updates the URL when server pagination changes", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      hasAnySubmissions: true,
      totalRecords: 25,
      totalPages: 3,
    });

    fireEvent.click(screen.getByRole("button", { name: /go page 2/i }));

    // Assert
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions?page=2&pageSize=20",
      { scroll: false },
    );
  });

  it("initializes date filter state from props", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      hasAnySubmissions: true,
      totalRecords: 1,
      totalPages: 1,
      initialCreatedAtFrom: "2026-01-01",
      initialCompletedAtTo: "2026-01-31",
    });

    // Assert
    screen.getByText("Created from: 2026-01-01");
    screen.getByText("Completed to: 2026-01-31");
  });

  it("updates the URL and resets to page 1 when created date filters change", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      hasAnySubmissions: true,
      initialPage: 3,
      initialPageSize: 20,
      totalRecords: 25,
      totalPages: 3,
    });

    fireEvent.click(screen.getByRole("button", { name: /set created from/i }));

    // Assert
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions?pageSize=20&createdAtFrom=2026-02-03",
      { scroll: false },
    );
  });

  it("updates the URL and resets to page 1 when completed date filters change", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      hasAnySubmissions: true,
      initialPage: 2,
      totalRecords: 25,
      totalPages: 3,
    });

    fireEvent.click(screen.getByRole("button", { name: /set completed to/i }));

    // Assert
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions?completedAtTo=2026-03-04",
      { scroll: false },
    );
  });

  it("resets status and date filters together", () => {
    // Act
    renderSubmissionsWithFilters({
      hasAnySubmissions: true,
      initialStatus: ["new"],
      initialCreatedAtFrom: "2026-01-01",
      totalRecords: 2,
      totalPages: 1,
    });

    const emptyState = screen
      .getByRole("heading", { name: "No submissions match these filters" })
      .closest("div");

    expect(emptyState).not.toBeNull();
    fireEvent.click(
      within(emptyState as HTMLElement).getByRole("button", {
        name: /reset filters/i,
      }),
    );

    // Assert
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions",
      { scroll: false },
    );
  });
});
