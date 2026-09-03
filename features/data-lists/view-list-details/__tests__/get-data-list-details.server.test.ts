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
});
