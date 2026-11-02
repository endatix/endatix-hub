import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import { SubmissionGridToolbar } from "../ui/submission-grid-toolbar";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";

vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));
vi.mock("../ui/submission-grid-view-menu", () => ({
  SubmissionGridViewMenu: () => null,
}));
vi.mock("@/features/export", () => ({ ExportSubmissionsButton: () => null }));

const updateUrl = vi.fn();

function renderToolbar(query: Record<string, string>, urlSetsSort: boolean) {
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl(query),
    urlSets: { sort: urlSetsSort, columns: false },
    updateUrl,
    isPending: false,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  render(<SubmissionGridToolbar formId="7" catalog={[]} disabled={false} />);
}

describe("SubmissionGridToolbar reset", () => {
  beforeEach(() => {
    updateUrl.mockClear();
  });

  it("offers no sort reset while the sort comes from the saved view", () => {
    // Arrange
    renderToolbar({ sort: "createdAt:desc" }, false);

    // Act
    const reset = screen.queryByRole("button", { name: /reset/i });

    // Assert
    expect(reset).toBeNull();
  });

  it("resets a sort the URL sets", () => {
    // Arrange
    renderToolbar({ sort: "createdAt:desc" }, true);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({ sort: null });
  });
});
