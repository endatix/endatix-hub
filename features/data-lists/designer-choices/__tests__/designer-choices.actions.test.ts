import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import { resolveDataListItemLabelsAction } from "../resolve-data-list-item-labels.action";
import { searchDataListItemsAction } from "../search-data-list-items.action";

const { mockListItems, mockRequireApi } = vi.hoisted(() => ({
  mockListItems: vi.fn(),
  mockRequireApi: vi.fn(),
}));

vi.mock("../../data-lists-api.server", () => ({
  requireDataListsApi: mockRequireApi,
}));

function item(value: string, label = value) {
  return { id: `id-${value}`, value, labels: { default: label } };
}

function page(
  pageNumber: number,
  items: ReturnType<typeof item>[],
  totalRecords: number,
  hasNextPage: boolean,
) {
  return ApiResult.success({
    page: pageNumber,
    pageSize: 25,
    totalRecords,
    totalPages: Math.ceil(totalRecords / 25),
    items,
    hasNextPage,
  });
}

function range(from: number, count: number) {
  return Array.from({ length: count }, (_, index) => item(`v${from + index}`));
}

describe("searchDataListItemsAction", () => {
  beforeEach(() => {
    mockListItems.mockReset();
    mockRequireApi.mockResolvedValue({
      dataLists: { listItems: mockListItems },
    });
  });

  it("reads one staff items page when skip is a multiple of take", async () => {
    mockListItems.mockResolvedValue(page(2, range(25, 25), 60, true));

    const result = await searchDataListItemsAction("42", {
      query: "york",
      matchMode: "StartsWith",
      locale: "es",
      includeLocales: ["es"],
      skip: 25,
      take: 25,
    });

    expect(mockListItems).toHaveBeenCalledTimes(1);
    expect(mockListItems).toHaveBeenCalledWith("42", {
      query: "york",
      matchMode: "StartsWith",
      locale: "es",
      includeLocales: ["es"],
      page: 2,
      pageSize: 25,
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.totalRecords).toBe(60);
      expect(result.value.items.map((choice) => choice.value)).toEqual(
        range(25, 25).map((choice) => choice.value),
      );
      expect(result.value.items[0]).toEqual({
        value: "v25",
        labels: { default: "v25" },
      });
    }
  });

  it("joins the two covering pages when skip is not a multiple of take", async () => {
    mockListItems.mockImplementation(
      async (_id: string, request: { page: number }) =>
        request.page === 1
          ? page(1, range(0, 25), 60, true)
          : page(2, range(25, 25), 60, true),
    );

    const result = await searchDataListItemsAction("42", {
      skip: 22,
      take: 25,
    });

    expect(mockListItems).toHaveBeenCalledTimes(2);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.items.map((choice) => choice.value)).toEqual(
        range(22, 25).map((choice) => choice.value),
      );
      expect(result.value.totalRecords).toBe(60);
    }
  });

  it("returns an error when the staff route fails", async () => {
    mockListItems.mockResolvedValue(ApiResult.forbiddenError("Forbidden"));

    const result = await searchDataListItemsAction("42", { skip: 0, take: 25 });

    expect(Result.isError(result)).toBe(true);
  });
});

describe("resolveDataListItemLabelsAction", () => {
  beforeEach(() => {
    mockListItems.mockReset();
    mockRequireApi.mockResolvedValue({
      dataLists: { listItems: mockListItems },
    });
  });

  it("looks each value up with an exact staff query and keeps only the value match", async () => {
    mockListItems.mockImplementation(
      async (_id: string, request: { query: string }) =>
        request.query === "sofia"
          ? page(
              1,
              [item("plovdiv", "sofia"), item("sofia", "Sofia")],
              2,
              false,
            )
          : page(1, [item("varna", "Varna")], 1, false),
    );

    const result = await resolveDataListItemLabelsAction(
      "42",
      ["sofia", "varna"],
      {
        locale: "bg",
        includeLocales: ["bg"],
      },
    );

    expect(mockListItems).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({
        query: "sofia",
        matchMode: "Exact",
        locale: "bg",
        includeLocales: ["bg"],
      }),
    );
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([
        { value: "sofia", labels: { default: "Sofia" } },
        { value: "varna", labels: { default: "Varna" } },
      ]);
    }
  });

  it("skips a value the list does not hold", async () => {
    mockListItems.mockResolvedValue(page(1, [], 0, false));

    const result = await resolveDataListItemLabelsAction("42", ["missing"]);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([]);
    }
  });
});
