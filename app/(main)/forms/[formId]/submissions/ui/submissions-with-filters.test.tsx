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

vi.mock("@/features/forms/application/actions/get-tenant-settings.action", () => ({
  getTenantSettingsAction: vi.fn(),
}));

vi.mock("@/features/submissions/ui/export", () => ({
  ExportSubmissionsButton: ({ disabled }: { disabled?: boolean }) => (
    <button disabled={disabled}>Export Submissions</button>
  ),
}));

vi.mock("@/features/submissions/ui/table", () => ({
  buildSubmissionDataColumns: () => [],
  COLUMNS_DEFINITION: [
    {
      id: "createdAt",
      meta: {
        displayName: "Created at",
      },
    },
  ],
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
    onPaginationChange,
  }: {
    data: Submission[];
    onPaginationChange?: (updater: Updater<PaginationState>) => void;
  }) => (
    <div data-testid="submissions-table">
      Rows: {data.length}
      <button
        onClick={() =>
          onPaginationChange?.({ pageIndex: 1, pageSize: 20 })
        }
      >
        Go page 2
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
      (screen.getByRole("button", {
        name: /export submissions/i,
      }) as HTMLButtonElement).disabled,
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
});
