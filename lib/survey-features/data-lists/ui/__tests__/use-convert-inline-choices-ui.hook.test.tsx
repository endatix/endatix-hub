import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  getConvertChoicesUiDeps,
  registerConvertChoicesUiDeps,
} from "../../conversion/convert-inline-choices-deps";
import { useConvertInlineChoicesUi } from "../use-convert-inline-choices-ui.hook";

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));

vi.mock(
  "@/features/data-lists/search-data-lists-for-picker",
  () => ({
    searchDataListsForPickerAction: mockSearch,
  }),
);

describe("useConvertInlineChoicesUi", () => {
  afterEach(() => {
    registerConvertChoicesUiDeps(null);
    vi.clearAllMocks();
  });

  it("registers convert choices UI dependencies", async () => {
    mockSearch.mockResolvedValue(
      Result.success({
        page: 1,
        pageSize: 25,
        totalRecords: 1,
        totalPages: 1,
        hasNextPage: false,
        items: [{ id: "1", name: "Countries" }],
      }),
    );
    const markFormModified = vi.fn();

    renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        markFormModified,
      }),
    );

    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    await expect(deps?.searchDataListNames("Countries")).resolves.toEqual([
      "Countries",
    ]);
    await deps?.refreshDataLists();
    deps?.markFormModified();
    expect(markFormModified).toHaveBeenCalledTimes(1);
  });

  it("resolves confirmation with the selected name", async () => {
    const { result } = renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        markFormModified: vi.fn(),
      }),
    );
    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    let promise: Promise<string | null> | null = null;

    act(() => {
      promise =
        deps?.confirmConvertInlineChoices({
          initialName: "Countries",
          errorMessage: "Name already exists.",
        }) ?? null;
    });
    await waitFor(() => {
      expect(result.current.dialog.open).toBe(true);
    });
    act(() => {
      result.current.dialog.onNameChange("Regions");
    });
    act(() => {
      result.current.dialog.onConfirm();
    });
    const confirmation = promise;
    if (!confirmation) {
      throw new Error("Expected confirmation promise.");
    }

    await expect(confirmation).resolves.toBe("Regions");
    expect(result.current.dialog.open).toBe(false);
    expect(result.current.dialog.errorMessage).toBeUndefined();
  });

  it("resolves confirmation with null when cancelled", async () => {
    const { result } = renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        markFormModified: vi.fn(),
      }),
    );
    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    let promise: Promise<string | null> | null = null;

    act(() => {
      promise =
        deps?.confirmConvertInlineChoices({ initialName: "Countries" }) ?? null;
    });
    await waitFor(() => {
      expect(result.current.dialog.open).toBe(true);
    });
    act(() => {
      result.current.dialog.onCancel();
    });
    const confirmation = promise;
    if (!confirmation) {
      throw new Error("Expected confirmation promise.");
    }

    await expect(confirmation).resolves.toBeNull();
    expect(result.current.dialog.open).toBe(false);
  });
});
