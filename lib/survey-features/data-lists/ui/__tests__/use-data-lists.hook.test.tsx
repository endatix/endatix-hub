import { renderHook, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDataLists, useDataListsLoader } from "../use-data-lists.hook";

const { mockGetDataListsAction } = vi.hoisted(() => ({
  mockGetDataListsAction: vi.fn(),
}));

vi.mock("@/features/data-lists/view-lists/get-data-lists.action", () => ({
  getDataListsAction: mockGetDataListsAction,
}));

describe("useDataLists hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch data lists when only binding hook is used", () => {
    // Arrange
    renderHook(() => useDataLists());

    // Act & Assert
    expect(mockGetDataListsAction).not.toHaveBeenCalled();
  });

  it("fetches data lists in loader hook and exposes loading state", async () => {
    // Arrange
    const dataLists = [{ id: 1, name: "Countries" }];
    mockGetDataListsAction.mockResolvedValue(Result.success(dataLists));

    // Act
    const { result } = renderHook(() => useDataListsLoader());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockGetDataListsAction).toHaveBeenCalledTimes(1);
    expect(result.current.dataLists).toEqual(dataLists);
  });
});
