import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { SubmissionListUrlState } from "@/features/submissions/list-submission-query";
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import type { Submission } from "@/lib/endatix-api/submissions/types";
import { SubmissionsWithFilters } from "@/features/submissions/ui/submissions-with-filters";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  isPending: false,
  systemColumnOptions: {
    current: undefined as
      | {
          onSubmitterDisplayIdFilterChange?: (value: string) => void;
          onSubmitterEmailFilterChange?: (value: string) => void;
        }
      | undefined,
  },
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useTransition: () => [
      navigationMocks.isPending,
      (callback: () => void) => {
        callback();
      },
    ],
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/forms/form-1/submissions",
  useSearchParams: () => new URLSearchParams("page=1&pageSize=10"),
  useRouter: () => ({
    push: navigationMocks.push,
    replace: navigationMocks.replace,
  }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
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

vi.mock("@/features/export", () => ({
  ExportSubmissionsButton: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Export Submissions</button>
  ),
}));

vi.mock("@/features/submissions/ui/table", () => ({
  buildSubmissionDataColumns: () => [],
  buildSubmissionSystemColumns: (options: unknown) => {
    navigationMocks.systemColumnOptions.current =
      options as typeof navigationMocks.systemColumnOptions.current;
    return [];
  },
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
    modifiedAt: {},
    startedAt: {},
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
  SubmissionsTableSkeleton: ({ pageSize }: { pageSize?: number }) => (
    <div data-testid="submissions-table-skeleton">
      Skeleton rows: {pageSize}
    </div>
  ),
  useColumnOrder: () => ({
    resetToDefault: vi.fn(),
    hasCustomOrder: false,
  }),
  useColumnVisibility: () => ({
    resetToDefault: vi.fn(),
    hasCustomVisibility: false,
  }),
}));

vi.mock("@/features/submissions/ui/submissions-table", () => ({
  default: ({
    data,
    onSortingChange,
  }: {
    data: Submission[];
    onSortingChange?: (updater: unknown) => void;
  }) => (
    <div data-testid="submissions-table">
      <span>Rows: {data.length}</span>
      <button
        type="button"
        onClick={() => onSortingChange?.([{ id: "createdAt", desc: true }])}
      >
        Sort createdAt desc
      </button>
      <button type="button" onClick={() => onSortingChange?.([])}>
        Clear sorting
      </button>
    </div>
  ),
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

const emptyListState: SubmissionListUrlState = {
  page: 1,
  pageSize: 10,
  isComplete: [],
  status: [],
  isTestSubmission: [],
  sorting: [],
};

function renderSubmissionsWithFilters({
  data = [],
  formId,
  hasAnySubmissions,
  initialStatus,
  initialSorting,
  initialPage = 1,
  initialPageSize = 10,
  totalRecords = 0,
  totalPages = 0,
}: {
  data?: Submission[];
  formId: string;
  hasAnySubmissions: boolean;
  initialStatus?: string[];
  initialSorting?: SubmissionListUrlState["sorting"];
  initialPage?: number;
  initialPageSize?: number;
  totalRecords?: number;
  totalPages?: number;
}) {
  const page: PagedResponse<Submission> = {
    items: data,
    page: initialPage,
    pageSize: initialPageSize,
    totalRecords,
    totalPages,
  };
  const listState: SubmissionListUrlState = {
    ...emptyListState,
    page: initialPage,
    pageSize: initialPageSize,
    status: (initialStatus ?? []) as SubmissionListUrlState["status"],
    sorting: initialSorting ?? [],
  };

  return render(
    <SubmissionsWithFilters
      formId={formId}
      hasAnySubmissions={hasAnySubmissions}
      page={page}
      listState={listState}
    />,
  );
}

describe("SubmissionsWithFilters", () => {
  beforeEach(() => {
    navigationMocks.push.mockClear();
    navigationMocks.replace.mockClear();
    navigationMocks.isPending = false;
    navigationMocks.systemColumnOptions.current = undefined;
    localStorage.clear();
  });

  it("shows the true empty state when deep-linked filters exist but the form has no submissions", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [],
      formId: "form-1",
      hasAnySubmissions: false,
      initialStatus: ["new"],
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    });

    // Assert
    screen.getByText("No submissions yet");
    expect(
      screen.queryByText("No submissions match current filters"),
    ).toBeNull();
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
      data: [],
      formId: "form-1",
      hasAnySubmissions: true,
      initialStatus: ["new"],
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    });

    // Assert — table path with zero rows (real UI shows copy inside DataTable; SubmissionsTable is mocked here)
    expect(screen.getByTestId("submissions-table").textContent).toContain(
      "Rows: 0",
    );
    expect(screen.queryByText("No submissions yet")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions",
      { scroll: false },
    );
  });

  it("renders the table path when rows are available", () => {
    // Act
    renderSubmissionsWithFilters({
      data: [submission],
      formId: "form-1",
      hasAnySubmissions: true,
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    });

    // Assert
    screen.getByTestId("submissions-table");
    expect(screen.queryByText("No submissions yet")).toBeNull();
    expect(
      screen.queryByText("No submissions match current filters"),
    ).toBeNull();
  });

  it("keeps the existing rows visible (dimmed) instead of swapping to a skeleton while URL navigation is pending", () => {
    navigationMocks.isPending = true;

    renderSubmissionsWithFilters({
      data: [submission],
      formId: "form-1",
      hasAnySubmissions: true,
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 1,
      totalPages: 1,
    });

    expect(screen.queryByTestId("submissions-table-skeleton")).toBeNull();
    expect(screen.getByTestId("submissions-table").textContent).toContain(
      "Rows: 1",
    );
    expect(screen.getByText("Updating…")).not.toBeNull();
  });

  it("debounces submitter text filters and replaces the URL", () => {
    vi.useFakeTimers();

    try {
      renderSubmissionsWithFilters({
        data: [submission],
        formId: "form-1",
        hasAnySubmissions: true,
        initialPage: 2,
        initialPageSize: 10,
        totalRecords: 1,
        totalPages: 1,
      });

      act(() => {
        navigationMocks.systemColumnOptions.current?.onSubmitterDisplayIdFilterChange?.(
          "panelist-a",
        );
        navigationMocks.systemColumnOptions.current?.onSubmitterDisplayIdFilterChange?.(
          "panelist-ab",
        );
      });

      expect(navigationMocks.push).not.toHaveBeenCalled();
      expect(navigationMocks.replace).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(navigationMocks.push).not.toHaveBeenCalled();
      expect(navigationMocks.replace).toHaveBeenCalledOnce();
      expect(navigationMocks.replace).toHaveBeenCalledWith(
        "/forms/form-1/submissions?submitterDisplayId=panelist-ab",
        { scroll: false },
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("writes sorting to the URL with replace navigation", () => {
    renderSubmissionsWithFilters({
      data: [submission],
      formId: "form-1",
      hasAnySubmissions: true,
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 1,
      totalPages: 1,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /sort createdat desc/i }),
    );

    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/forms/form-1/submissions?sort=createdAt%3Adesc",
      { scroll: false },
    );
  });

  it("preserves existing sorting when resetting filters", () => {
    renderSubmissionsWithFilters({
      data: [],
      formId: "form-1",
      hasAnySubmissions: true,
      initialStatus: ["new"],
      initialSorting: [{ id: "createdAt", desc: true }],
      initialPage: 1,
      initialPageSize: 10,
      totalRecords: 0,
      totalPages: 0,
    });

    fireEvent.click(screen.getByRole("menuitem", { name: /reset filters/i }));

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/forms/form-1/submissions?sort=createdAt%3Adesc",
      { scroll: false },
    );
  });
});
