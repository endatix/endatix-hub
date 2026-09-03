import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { searchDataListNamesForPicker } from "../search-data-list-names";

const { mockSearch } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
}));

vi.mock("../search-data-lists-for-picker.action", () => ({
  searchDataListsForPickerAction: mockSearch,
}));

describe("searchDataListNamesForPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps picker items to names", async () => {
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

    await expect(searchDataListNamesForPicker("Coun")).resolves.toEqual([
      "Countries",
    ]);
    expect(mockSearch).toHaveBeenCalledWith({
      search: "Coun",
      page: 1,
      pageSize: 25,
    });
  });

  it("returns an empty list when search fails", async () => {
    mockSearch.mockResolvedValue(Result.error("Failed to search data lists."));

    await expect(searchDataListNamesForPicker("Coun")).resolves.toEqual([]);
  });
});
