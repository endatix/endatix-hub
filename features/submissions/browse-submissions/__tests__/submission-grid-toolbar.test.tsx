import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import type { AnswerColumn } from "../submission-grid-columns";
import { countTestSubmissionsAction } from "../submission-test-flag.action";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import { SubmissionGridToolbar } from "../ui/submission-grid-toolbar";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";
import { SubmissionTestAccessProvider } from "../ui/submission-test-access-context";

vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));
vi.mock("../ui/submission-grid-view-menu", () => ({
  SubmissionGridViewMenu: () => null,
  SubmissionGridViewItems: () => null,
}));
vi.mock("../ui/submission-grid-view-context", () => ({
  useSubmissionGridView: () => ({}),
}));
vi.mock("../submission-test-flag.action", () => ({
  countTestSubmissionsAction: vi.fn(),
  deleteTestSubmissionsAction: vi.fn(),
}));
vi.mock("@/features/export", () => ({ ExportSubmissionsButton: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const updateUrl = vi.fn();

function renderToolbar(
  query: Record<string, string>,
  urlSetsSort: boolean,
  {
    canDeleteTests = false,
    catalog = [],
  }: { canDeleteTests?: boolean; catalog?: AnswerColumn[] } = {},
) {
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl(query),
    urlSets: { sort: urlSetsSort, columns: false },
    updateUrl,
    isPending: false,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  render(
    <SubmissionTestAccessProvider access={{ canMark: false, canDeleteTests }}>
      <SubmissionGridToolbar
        formId="7"
        catalog={catalog}
        columnSearch={{ canEdit: false }}
        exportAccess={{ canExport: true, canPrepare: true, canRebuild: false }}
        disabled={false}
      />
    </SubmissionTestAccessProvider>,
  );
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

describe("SubmissionGridToolbar layout", () => {
  it("counts the facets with a selection on Filters", () => {
    // Arrange & Act
    renderToolbar(
      { collectionStatus: "complete", isTestSubmission: "true" },
      false,
    );

    // Assert
    expect(screen.getByRole("button", { name: "Filters · 2" })).toBeTruthy();
  });

  it("offers Delete test submissions from ⋯, not as a toolbar button", () => {
    // Arrange
    renderToolbar({}, false, { canDeleteTests: true });

    // Act
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "More actions" }),
      { button: 0, ctrlKey: false },
    );

    // Assert
    expect(
      screen.getByRole("menuitem", { name: "Delete test submissions…" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /delete test submissions/i }),
    ).toBeNull();
  });

  it("puts nothing about test submissions in ⋯ without delete access", () => {
    // Arrange
    renderToolbar({}, false);

    // Act
    fireEvent.pointerDown(
      screen.getByRole("button", { name: "More actions" }),
      { button: 0, ctrlKey: false },
    );

    // Assert
    expect(
      screen.queryByRole("menuitem", { name: /delete test submissions/i }),
    ).toBeNull();
  });
});

const NAME_COLUMN: AnswerColumn = {
  key: "q1",
  kind: "Simple",
  title: "First name",
  questionType: "text",
  filterType: "text",
  search: { state: "ready", source: "auto" },
  placement: { pageName: "page1", pageTitle: "Page one", panelTitle: null },
};

/** Vaul's stylesheet gives the drawer a close animation; jsdom never ends it. */
function endCloseAnimation(element: HTMLElement) {
  const end = Object.assign(new Event("animationend"), {
    animationName: getComputedStyle(element).animationName,
  });
  fireEvent(element, end);
}

function openMoreActionsItem(name: string) {
  const more = screen.getByRole("button", { name: "More actions" });
  more.focus();
  fireEvent.pointerDown(more, { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByRole("menuitem", { name }));
  return more;
}

describe("SubmissionGridToolbar focus after a ⋯ overlay closes", () => {
  beforeEach(() => {
    stubPhoneWidth();
    stubResizeObserver();
    vi.mocked(countTestSubmissionsAction).mockResolvedValue(Result.success(2));
  });

  it("returns focus to More actions when the delete confirm is dismissed", async () => {
    // Arrange
    renderToolbar({}, false, { canDeleteTests: true });
    const more = openMoreActionsItem("Delete test submissions…");
    const confirm = await screen.findByRole("alertdialog");

    // Act
    fireEvent.keyDown(confirm, { key: "Escape" });

    // Assert
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(more);
  });

  it("returns focus to More actions when the Columns drawer is dismissed", async () => {
    // Arrange
    renderToolbar({}, false, { catalog: [NAME_COLUMN] });
    const more = openMoreActionsItem("Columns…");
    const drawer = await screen.findByRole("dialog", { name: "Columns" });

    // Act
    fireEvent.keyDown(drawer, { key: "Escape" });
    endCloseAnimation(drawer);

    // Assert
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Columns" })).toBeNull(),
    );
    expect(document.activeElement).toBe(more);
  });
});
