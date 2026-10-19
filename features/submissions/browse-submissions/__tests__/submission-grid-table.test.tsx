import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { SubmissionGridTable } from "../ui/submission-grid-table";
import { SubmissionGridUrlProvider } from "../ui/submission-grid-url-context";
import { SubmissionGridViewProvider } from "../ui/submission-grid-view-context";

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

function renderTable(rows: SubmissionGridRow[]) {
  const page = normalizePagedResponse({
    items: rows,
    page: 1,
    pageSize: 10,
    totalRecords: rows.length,
    totalPages: 1,
  });
  return render(
    <SubmissionGridUrlProvider viewDefaults={{}}>
      <SubmissionGridViewProvider
        formId="7"
        catalog={[]}
        view={{ revision: null, settings: { v: 1, columns: [] } }}
        canSaveView={false}
      >
        <SubmissionGridTable
          page={page}
          answerColumns={[]}
          submitterLabel="Submitter"
        />
      </SubmissionGridViewProvider>
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
