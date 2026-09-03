import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { getDataListDetails } from "../get-data-list-details.server";

const { mockGetById, mockRequireApi } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockRequireApi: vi.fn(),
}));

vi.mock("../../data-lists-api.server", () => ({
  requireDataListsApi: mockRequireApi,
}));

describe("getDataListDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApi.mockResolvedValue({
      dataLists: { getById: mockGetById },
    });
  });

  it("rejects a non-numeric id without calling the API", async () => {
    const result = await getDataListDetails("not-an-id");

    expect(Result.isError(result)).toBe(true);
    expect(mockRequireApi).not.toHaveBeenCalled();
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it("returns details from GET /data-lists/{id}", async () => {
    mockGetById.mockResolvedValue({
      success: true,
      data: {
        id: "99",
        name: "Cities",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        itemsCount: 3,
        items: [],
      },
    });

    const result = await getDataListDetails("99");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.name).toBe("Cities");
    }
    expect(mockGetById).toHaveBeenCalledWith("99", { includeItems: false });
  });

  it("normalizes omitted items when includeItems is false", async () => {
    mockGetById.mockResolvedValue({
      success: true,
      data: {
        id: "99",
        name: "Cities",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        itemsCount: 3,
      },
    });

    const result = await getDataListDetails("99");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.items).toEqual([]);
    }
  });
});
