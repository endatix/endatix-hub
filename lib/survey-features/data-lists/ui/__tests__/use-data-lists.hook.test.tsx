import { renderHook, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

const { mockGetDataListsForCreatorAction } = vi.hoisted(() => ({
  mockGetDataListsForCreatorAction: vi.fn(),
}));

vi.mock(
  "@/features/data-lists/view-lists/get-data-lists-for-creator.action",
  () => ({
    getDataListsForCreatorAction: mockGetDataListsForCreatorAction,
  }),
);
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
    const { useDataLists } = hooksModule;
    renderHook(() => useDataLists());

    expect(mockGetDataListsForCreatorAction).not.toHaveBeenCalled();
  });

  it("fetches all data lists in loader hook and exposes loading state", async () => {
    const { useDataListsLoader } = hooksModule;
    const dataLists = [
      { id: 1, name: "Countries" },
      { id: 2, name: "Cities" },
    ];
    mockGetDataListsForCreatorAction.mockResolvedValue(
      Result.success(dataLists),
    );

    const { result } = renderHook(() => useDataListsLoader());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockGetDataListsForCreatorAction).toHaveBeenCalledTimes(1);
    expect(result.current.dataLists).toEqual(dataLists);
    expect(result.current.error).toBeNull();
  });

  it("surfaces fetch failures via error and empty dataLists", async () => {
    const { useDataListsLoader } = hooksModule;
    mockGetDataListsForCreatorAction.mockResolvedValue(
      Result.error("Unauthorized"),
    );

    const { result } = renderHook(() => useDataListsLoader());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.dataLists).toEqual([]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Unauthorized");
  });
});
