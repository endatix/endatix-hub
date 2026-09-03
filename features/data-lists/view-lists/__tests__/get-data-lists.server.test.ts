import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorType } from "@/lib/endatix-api/shared/api-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import { Result } from "@/lib/result";
import {
  getDataListsPage,
  getDataListsPageResult,
} from "../get-data-lists.server";

const { mockList, mockRequireApi } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockRequireApi: vi.fn(),
}));

vi.mock("../../data-lists-api.server", () => ({
  requireDataListsApi: mockRequireApi,
}));

const emptyPage = {
  page: 1,
  pageSize: 25,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  items: [],
};

describe("getDataListsPageResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApi.mockResolvedValue({
      dataLists: { list: mockList, listLocales: vi.fn() },
    });
  });

  it("maps a successful list response", async () => {
    mockList.mockResolvedValue({ success: true, data: emptyPage });

    const result = await getDataListsPageResult({ page: 1, pageSize: 25 });

    expect(Result.isSuccess(result)).toBe(true);
    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
  });

  it("throws DataLoadError from getDataListsPage on API failure", async () => {
    mockList.mockResolvedValue({
      success: false,
      error: {
        type: ApiErrorType.ServerError,
        message: "boom",
      },
    });

    await expect(getDataListsPage({ page: 1 })).rejects.toBeInstanceOf(
      DataLoadError,
    );
  });
});
