import { Result } from "@/lib/result";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSubmissionGridViewAction } from "../save-submission-grid-view.action";
import type { AnswerColumn } from "../submission-grid-columns";
import type { SubmissionGridViewLoad } from "../submission-grid-view";
import { SubmissionGridTable } from "../ui/submission-grid-table";
import { SubmissionGridUrlProvider } from "../ui/submission-grid-url-context";
import {
  SubmissionGridViewProvider,
  useSubmissionGridView,
} from "../ui/submission-grid-view-context";

const navigation = vi.hoisted(() => ({
  router: { replace: vi.fn(), refresh: vi.fn(), push: vi.fn() },
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation.router,
  usePathname: () => "/forms/7/submissions",
  useSearchParams: () => navigation.searchParams,
}));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }));
vi.mock("../save-submission-grid-view.action", () => ({
  saveSubmissionGridViewAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));

const ON_SCREEN_WIDTH = 120;

beforeAll(() => {
  // jsdom lays nothing out; give every cell the same on-screen width.
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ width: ON_SCREEN_WIDTH }) as DOMRect;
});

const answer: AnswerColumn = {
  key: "q1",
  kind: "Simple",
  title: "Favourite colour",
  questionType: "text",
  filterType: null,
  placement: { pageName: null, pageTitle: null, panelTitle: null },
};

const SAVED: SubmissionGridViewLoad = {
  revision: "3",
  settings: {
    v: 1,
    columns: [
      { key: "completedAt", visible: false },
      { key: "q1", visible: true, width: 240 },
    ],
  },
};

const row: SubmissionGridRow = {
  id: "9007199254740993",
  formId: "7",
  formDefinitionId: "2",
  isComplete: true,
  collectionStatus: "complete",
  status: "new",
  submitterDisplayId: "visitor-1",
  createdAt: "2026-10-01T10:00:00Z",
  rowState: "prepared",
  answers: { q1: "Teal" },
  answersSource: "prepared",
};

function SaveButton() {
  const { save } = useSubmissionGridView();
  return (
    <button type="button" onClick={save}>
      Save
    </button>
  );
}

function renderTable() {
  const page = normalizePagedResponse({
    items: [row],
    page: 1,
    pageSize: 10,
    totalRecords: 1,
    totalPages: 1,
  });
  render(
    <SubmissionGridUrlProvider viewSettings={SAVED.settings}>
      <SubmissionGridViewProvider
        formId="7"
        catalog={[answer]}
        view={SAVED}
        canSaveView
      >
        <SubmissionGridTable
          page={page}
          answerColumns={[answer]}
          submitterLabel="Submitter"
        />
        <SaveButton />
      </SubmissionGridViewProvider>
    </SubmissionGridUrlProvider>,
  );
}

const header = (name: string) =>
  screen.getByRole("columnheader", { name: new RegExp(name, "i") });

describe("SubmissionGridTable with a saved view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("leaves out the details the view hides", () => {
    // Act
    renderTable();

    // Assert
    expect(
      screen.queryByRole("columnheader", { name: /^completed/i }),
    ).toBeNull();
    expect(header("started")).toBeTruthy();
  });

  it("draws an answer column at its saved width", () => {
    // Act
    renderTable();

    // Assert
    expect(header("favourite colour").style.width).toBe("240px");
    expect(screen.getByRole("cell", { name: "Teal" }).style.width).toBe(
      "240px",
    );
  });

  it("saves a column's new width after a resize", async () => {
    // Arrange
    vi.mocked(saveSubmissionGridViewAction).mockResolvedValue(
      Result.success({ ...SAVED, revision: "4" }),
    );
    renderTable();
    const created = header("created");
    const handle = created.querySelector("button[aria-label^='Resize']");

    // Act
    fireEvent.keyDown(handle as Element, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Assert
    await waitFor(() =>
      expect(saveSubmissionGridViewAction).toHaveBeenCalled(),
    );
    const { settings } = vi.mocked(saveSubmissionGridViewAction).mock
      .calls[0][1];
    expect(settings.columns).toContainEqual({
      key: "createdAt",
      visible: true,
      width: ON_SCREEN_WIDTH + 16,
    });
  });
});
