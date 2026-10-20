import { Result } from "@/lib/result";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSubmissionGridViewAction } from "../save-submission-grid-view.action";
import type { AnswerColumn } from "../submission-grid-columns";
import type { SubmissionGridViewLoad } from "../submission-grid-view";
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
  usePathname: () => "/forms/42/submissions",
  useSearchParams: () => navigation.searchParams,
}));
vi.mock("../save-submission-grid-view.action", () => ({
  saveSubmissionGridViewAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));

const catalog: AnswerColumn[] = ["q1", "q2", "q3"].map((key) => ({
  key,
  kind: "Simple",
  title: key,
  questionType: "text",
  filterType: null,
  placement: { pageName: null, pageTitle: null, panelTitle: null },
}));

const SAVED: SubmissionGridViewLoad = {
  revision: "3",
  settings: {
    v: 1,
    columns: [
      { key: "createdAt", visible: true, width: 140 },
      { key: "q2", visible: true },
      { key: "q1", visible: true },
    ],
    pageSize: 30,
    sort: { key: "createdAt", direction: "asc" },
  },
};

function renderView(view: SubmissionGridViewLoad, query = "") {
  navigation.searchParams = new URLSearchParams(query);
  globalThis.history.replaceState(null, "", `/forms/42/submissions?${query}`);
  let current = view;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubmissionGridUrlProvider viewSettings={current.settings}>
      <SubmissionGridViewProvider
        formId="42"
        catalog={catalog}
        view={current}
        canSaveView
      >
        {children}
      </SubmissionGridViewProvider>
    </SubmissionGridUrlProvider>
  );
  const hook = renderHook(() => useSubmissionGridView(), { wrapper });
  const rerenderWith = (next: SubmissionGridViewLoad) => {
    current = next;
    hook.rerender();
  };
  return { ...hook, rerenderWith };
}

function savedSettings() {
  return vi.mocked(saveSubmissionGridViewAction).mock.calls[0][1].settings;
}

describe("SubmissionGridViewProvider with the grid's URL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("saves what the grid shows: the view, the URL's own choices and the unsaved layout", async () => {
    // Arrange
    vi.mocked(saveSubmissionGridViewAction).mockResolvedValue(
      Result.success({ ...SAVED, revision: "4" }),
    );
    const { result } = renderView(SAVED, "sort=modifiedAt%3Adesc");

    // Act
    act(() => result.current.setMetadataVisible("status", false));
    act(() => result.current.onColumnSizingChange({ "answer:q1": 260 }));
    act(() => result.current.save());

    // Assert
    await waitFor(() =>
      expect(saveSubmissionGridViewAction).toHaveBeenCalled(),
    );
    const settings = savedSettings();
    expect(settings.pageSize).toBe(30);
    expect(settings.sort).toEqual({ key: "modifiedAt", direction: "desc" });
    expect(settings.columns.slice(-2)).toEqual([
      { key: "q2", visible: true },
      { key: "q1", visible: true, width: 260 },
    ]);
    expect(settings.columns).toContainEqual({ key: "status", visible: false });
  });

  it("keeps the unsaved layout and stays put when a save fails", async () => {
    // Arrange
    vi.mocked(saveSubmissionGridViewAction).mockResolvedValue(
      Result.validationError("Settings are too large."),
    );
    const { result } = renderView(SAVED, "columns=q3");

    // Act
    act(() => result.current.setMetadataVisible("status", false));
    act(() => result.current.save());

    // Assert
    await waitFor(() =>
      expect(result.current.saveError).toBe("Settings are too large."),
    );
    expect(result.current.hiddenMetadata).toEqual(["status"]);
    expect(navigation.router.replace).not.toHaveBeenCalled();
    expect(navigation.router.refresh).not.toHaveBeenCalled();
  });

  it("starts from the new view when its revision changes", () => {
    // Arrange
    const { result, rerenderWith } = renderView(SAVED);
    act(() => result.current.setMetadataVisible("status", false));

    // Act
    rerenderWith({
      revision: "5",
      settings: { v: 1, columns: [{ key: "startedAt", visible: false }] },
    });

    // Assert
    expect(result.current.hiddenMetadata).toEqual(["startedAt"]);
  });

  it("keeps the unsaved layout while the revision stays the same", () => {
    // Arrange
    const { result, rerenderWith } = renderView(SAVED);
    act(() => result.current.setMetadataVisible("status", false));

    // Act
    rerenderWith({ ...SAVED, settings: { ...SAVED.settings } });

    // Assert
    expect(result.current.hiddenMetadata).toEqual(["status"]);
  });
});
