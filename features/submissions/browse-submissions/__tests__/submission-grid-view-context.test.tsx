import { Result } from "@/lib/result";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSubmissionGridViewAction } from "../save-submission-grid-view.action";
import type { AnswerColumn } from "../submission-grid-columns";
import { parseSubmissionGridUrl } from "../submission-grid-url";
import {
  DEFAULT_SUBMISSION_VIEW_SETTINGS,
  type SubmissionGridViewLoad,
} from "../submission-grid-view";
import {
  legacyColumnVisibilityKey,
  legacyViewMigratedKey,
} from "../submission-grid-view-migration";
import { VIEW_CONFLICT_MESSAGE } from "../submission-grid-view-save-outcome";
import { useSubmissionGridUrl } from "../ui/submission-grid-url-context";
import {
  SubmissionGridViewProvider,
  useSubmissionGridView,
} from "../ui/submission-grid-view-context";

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
  useSearchParams: () => navigation.searchParams,
}));
vi.mock("../save-submission-grid-view.action", () => ({
  saveSubmissionGridViewAction: vi.fn(),
}));
vi.mock("../ui/submission-grid-url-context", () => ({
  useSubmissionGridUrl: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));

const FORM_ID = "42";
const updateUrl = vi.fn();
const catalog: AnswerColumn[] = ["q1", "q2"].map((key) => ({
  key,
  kind: "Simple",
  title: key,
  questionType: "text",
  filterType: null,
  placement: { pageName: null, pageTitle: null, panelTitle: null },
}));

function renderView(view: SubmissionGridViewLoad, query = "") {
  navigation.searchParams = new URLSearchParams(query);
  globalThis.history.replaceState(null, "", `/forms/42/submissions?${query}`);
  vi.mocked(useSubmissionGridUrl).mockReturnValue({
    urlState: parseSubmissionGridUrl(
      Object.fromEntries(navigation.searchParams),
    ),
    urlSets: { sort: false, columns: navigation.searchParams.has("columns") },
    updateUrl,
    isPending: false,
    textFilters: {},
    setTextFilter: vi.fn(),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubmissionGridViewProvider
      formId={FORM_ID}
      catalog={catalog}
      view={view}
      canSaveView
    >
      {children}
    </SubmissionGridViewProvider>
  );
  return renderHook(() => useSubmissionGridView(), { wrapper });
}

const SAVED_VIEW: SubmissionGridViewLoad = {
  version: "3",
  settings: DEFAULT_SUBMISSION_VIEW_SETTINGS,
};
const UNSAVED_VIEW: SubmissionGridViewLoad = { ...SAVED_VIEW, version: "0" };

describe("SubmissionGridViewProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a conflict inline and reads the view again", async () => {
    // Arrange
    vi.mocked(saveSubmissionGridViewAction).mockResolvedValue(
      Result.error("Conflict", undefined, undefined, { statusCode: 409 }),
    );
    const { result } = renderView(SAVED_VIEW, "columns=q2&pageSize=20");

    // Act
    act(() => result.current.save());

    // Assert
    await waitFor(() =>
      expect(result.current.saveError).toBe(VIEW_CONFLICT_MESSAGE),
    );
    expect(saveSubmissionGridViewAction).toHaveBeenCalledWith(
      FORM_ID,
      expect.objectContaining({ version: "3" }),
    );
    expect(updateUrl).toHaveBeenCalledWith({
      columns: null,
      pageSize: null,
      sort: null,
      page: null,
    });
  });

  it("refreshes after a save when the URL holds no view choices", async () => {
    // Arrange
    vi.mocked(saveSubmissionGridViewAction).mockResolvedValue(
      Result.success({
        version: "4",
        settings: DEFAULT_SUBMISSION_VIEW_SETTINGS,
      }),
    );
    const { result } = renderView(SAVED_VIEW);

    // Act
    act(() => result.current.save());

    // Assert
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
    expect(result.current.saveError).toBeNull();
    expect(updateUrl).not.toHaveBeenCalled();
  });

  it("migrates the legacy view once while nothing is saved", () => {
    // Arrange
    localStorage.setItem(
      legacyColumnVisibilityKey(FORM_ID),
      JSON.stringify({
        columnVisibility: { data_q2: true, startedAt: false },
        version: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      }),
    );

    // Act
    const { result } = renderView(UNSAVED_VIEW);
    renderView(UNSAVED_VIEW);

    // Assert
    expect(result.current.hiddenMetadata).toEqual(["startedAt"]);
    expect(updateUrl).toHaveBeenCalledTimes(1);
    expect(updateUrl).toHaveBeenCalledWith({ columns: "q2" });
  });

  it("does not read the legacy view over a saved one", () => {
    // Arrange
    localStorage.setItem(
      legacyColumnVisibilityKey(FORM_ID),
      JSON.stringify({
        columnVisibility: { data_q2: true },
        version: 1,
        updatedAt: "",
      }),
    );

    // Act
    renderView(SAVED_VIEW);

    // Assert
    expect(updateUrl).not.toHaveBeenCalled();
    expect(localStorage.getItem(legacyViewMigratedKey(FORM_ID))).toBeNull();
  });
});
