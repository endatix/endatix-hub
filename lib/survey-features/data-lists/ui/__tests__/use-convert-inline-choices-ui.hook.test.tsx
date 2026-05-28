import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataList } from "@/lib/endatix-api/data-lists/types";
import {
  getConvertChoicesUiDeps,
  registerConvertChoicesUiDeps,
} from "../../conversion/convert-inline-choices-deps";
import { useConvertInlineChoicesUi } from "../use-convert-inline-choices-ui.hook";

const dataLists: DataList[] = [
  {
    id: "1",
    name: "Countries",
    isActive: true,
    createdAt: new Date(),
    itemsCount: 0,
  },
];

describe("useConvertInlineChoicesUi", () => {
  afterEach(() => {
    registerConvertChoicesUiDeps(null);
  });

  it("registers convert choices UI dependencies", async () => {
    // Arrange
    const refetchDataLists = vi.fn().mockResolvedValue(undefined);
    const markFormModified = vi.fn();

    // Act
    renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        dataLists,
        refetchDataLists,
        markFormModified,
      }),
    );

    // Assert
    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    expect(deps?.getDataListNames()).toEqual(["Countries"]);
    await deps?.refreshDataLists();
    expect(refetchDataLists).toHaveBeenCalledTimes(1);
    deps?.markFormModified();
    expect(markFormModified).toHaveBeenCalledTimes(1);
  });

  it("resolves confirmation with the selected name", async () => {
    // Arrange
    const { result } = renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        dataLists,
        refetchDataLists: vi.fn().mockResolvedValue(undefined),
        markFormModified: vi.fn(),
      }),
    );
    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    let promise: Promise<string | null> | null = null;

    // Act
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

    // Assert
    await expect(confirmation).resolves.toBe("Regions");
    expect(result.current.dialog.open).toBe(false);
    expect(result.current.dialog.errorMessage).toBeUndefined();
  });

  it("resolves confirmation with null when cancelled", async () => {
    // Arrange
    const { result } = renderHook(() =>
      useConvertInlineChoicesUi({
        creator: null,
        dataLists,
        refetchDataLists: vi.fn().mockResolvedValue(undefined),
        markFormModified: vi.fn(),
      }),
    );
    await waitFor(() => {
      expect(getConvertChoicesUiDeps()).not.toBeNull();
    });
    const deps = getConvertChoicesUiDeps();
    let promise: Promise<string | null> | null = null;

    // Act
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

    // Assert
    await expect(confirmation).resolves.toBeNull();
    expect(result.current.dialog.open).toBe(false);
  });
});
