import { renderHook, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DataLoadError } from "@/lib/errors/data-load-error";

const { mockGetDataListsAction } = vi.hoisted(() => ({
  mockGetDataListsAction: vi.fn(),
}));

vi.mock("@/features/data-lists/view-lists/get-data-lists.action", () => ({
  getAllDataListsAction: mockGetDataListsAction,
}));
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

const loadUseDataListsHook = () => import("../use-data-lists.hook");

describe("useDataLists hooks", () => {
  let hooksModule: Awaited<ReturnType<typeof loadUseDataListsHook>>;

  beforeAll(async () => {
    hooksModule = await loadUseDataListsHook();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch data lists when only binding hook is used", () => {
    // Arrange
    const { useDataLists } = hooksModule;
    renderHook(() => useDataLists());

    // Act & Assert
    expect(mockGetDataListsAction).not.toHaveBeenCalled();
  });

  it("fetches data lists in loader hook and exposes loading state", async () => {
    // Arrange
    const { useDataListsLoader } = hooksModule;
    const dataLists = [{ id: 1, name: "Countries" }];
    mockGetDataListsAction.mockResolvedValue(dataLists);

    // Act
    const { result } = renderHook(() => useDataListsLoader());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockGetDataListsAction).toHaveBeenCalledTimes(1);
    expect(result.current.dataLists).toEqual(dataLists);
    expect(result.current.error).toBeNull();
  });

  it("surfaces fetch failures via error and empty dataLists", async () => {
    // Arrange
    const { useDataListsLoader } = hooksModule;
    mockGetDataListsAction.mockRejectedValue(new DataLoadError("Unauthorized"));

    // Act
    const { result } = renderHook(() => useDataListsLoader());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.dataLists).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Unauthorized");
  });
});
