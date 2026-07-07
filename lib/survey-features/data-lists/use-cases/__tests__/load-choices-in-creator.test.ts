import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { loadChoicesInCreator } from "../load-choices-in-creator";
import { searchDataListChoices } from "../search-data-list-choices";

vi.mock("../search-data-list-choices", () => ({
  searchDataListChoices: vi.fn(),
}));

const deps = {} as ExtensionRuntimeDeps;
const formatLabel = (sourceName: string, value: string, text: string) =>
  `${sourceName}: (${text || value})`;

function mockSource(
  _dataListId: string,
  _params: { skip: number; take: number },
  items: Array<{ value: string; text: string }>,
  total: number,
) {
  return ApiResult.success({ items, total });
}

describe("loadChoicesInCreator", () => {
  beforeEach(() => {
    vi.mocked(searchDataListChoices).mockReset();
  });

  it("loads the first page from the first data-list source only", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          return mockSource(
            "games",
            params,
            Array.from({ length: params.take }, (_, index) => ({
              value: `game-${index + 1 + params.skip}`,
              text: `Game ${index + 1 + params.skip}`,
            })),
            400,
          );
        }

        return ApiResult.success({ items: [], total: 0 });
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [{ sourceName: "games", dataListId: "games" }],
      [],
      { skip: 0, take: 25 },
      formatLabel,
    );

    expect(result.items).toHaveLength(25);
    expect(result.items[0]).toEqual({
      value: "game-1",
      text: "games: (Game 1)",
    });
    expect(result.total).toBe(400);
    expect(searchDataListChoices).toHaveBeenCalledTimes(1);
    expect(searchDataListChoices).toHaveBeenCalledWith(
      deps,
      "games",
      expect.objectContaining({ skip: 0, take: 25 }),
    );
  });

  it("continues into the next source when the first list is exhausted", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          const start = params.skip;
          const values = Array.from(
            { length: Math.max(0, 100 - start) },
            (_, index) => ({
              value: `game-${start + index + 1}`,
              text: `Game ${start + index + 1}`,
            }),
          ).slice(0, params.take);

          return mockSource("games", params, values, 100);
        }

        if (dataListId === "brands") {
          return mockSource(
            "brands",
            params,
            Array.from({ length: params.take }, (_, index) => ({
              value: `brand-${index + 1 + params.skip}`,
              text: `Brand ${index + 1 + params.skip}`,
            })),
            300,
          );
        }

        return ApiResult.success({ items: [], total: 0 });
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [
        { sourceName: "games", dataListId: "games" },
        { sourceName: "brands", dataListId: "brands" },
      ],
      [],
      { skip: 100, take: 25 },
      formatLabel,
    );

    expect(result.items).toHaveLength(25);
    expect(result.items[0]).toEqual({
      value: "brand-1",
      text: "brands: (Brand 1)",
    });
    expect(result.total).toBe(400);

    expect(searchDataListChoices).toHaveBeenNthCalledWith(
      1,
      deps,
      "games",
      expect.objectContaining({ skip: 100, take: 25 }),
    );
    expect(searchDataListChoices).toHaveBeenNthCalledWith(
      2,
      deps,
      "brands",
      expect.objectContaining({ skip: 0, take: 25 }),
    );
  });

  it("spans the tail of one source and the head of the next in a single page", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          const start = params.skip;
          const values = Array.from(
            { length: Math.max(0, 100 - start) },
            (_, index) => ({
              value: `game-${start + index + 1}`,
              text: `Game ${start + index + 1}`,
            }),
          ).slice(0, params.take);

          return mockSource("games", params, values, 100);
        }

        if (dataListId === "brands") {
          return mockSource(
            "brands",
            params,
            Array.from({ length: params.take }, (_, index) => ({
              value: `brand-${index + 1 + params.skip}`,
              text: `Brand ${index + 1 + params.skip}`,
            })),
            300,
          );
        }

        return ApiResult.success({ items: [], total: 0 });
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [
        { sourceName: "games", dataListId: "games" },
        { sourceName: "brands", dataListId: "brands" },
      ],
      [],
      { skip: 95, take: 25 },
      formatLabel,
    );

    expect(result.items).toHaveLength(25);
    expect(result.items.slice(0, 5).map((item) => item.value)).toEqual([
      "game-96",
      "game-97",
      "game-98",
      "game-99",
      "game-100",
    ]);
    expect(result.items.slice(5, 10).map((item) => item.value)).toEqual([
      "brand-1",
      "brand-2",
      "brand-3",
      "brand-4",
      "brand-5",
    ]);

    expect(searchDataListChoices).toHaveBeenNthCalledWith(
      2,
      deps,
      "brands",
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("offsets into later sources after earlier sources are fully skipped", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          return mockSource("games", params, [], 100);
        }

        if (dataListId === "brands") {
          return mockSource(
            "brands",
            params,
            Array.from({ length: params.take }, (_, index) => ({
              value: `brand-${index + 1 + params.skip}`,
              text: `Brand ${index + 1 + params.skip}`,
            })),
            300,
          );
        }

        return ApiResult.success({ items: [], total: 0 });
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [
        { sourceName: "games", dataListId: "games" },
        { sourceName: "brands", dataListId: "brands" },
      ],
      [],
      { skip: 120, take: 25 },
      formatLabel,
    );

    expect(result.items[0]).toEqual({
      value: "brand-21",
      text: "brands: (Brand 21)",
    });
    expect(searchDataListChoices).toHaveBeenNthCalledWith(
      2,
      deps,
      "brands",
      expect.objectContaining({ skip: 20, take: 25 }),
    );
  });

  it("deduplicates values that appear in multiple sources", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          return mockSource(
            "games",
            params,
            [{ value: "shared", text: "Shared Game" }],
            1,
          );
        }

        if (dataListId === "brands") {
          return mockSource(
            "brands",
            params,
            [
              { value: "shared", text: "Shared Brand" },
              { value: "brand-2", text: "Brand 2" },
            ],
            2,
          );
        }

        return ApiResult.success({ items: [], total: 0 });
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [
        { sourceName: "games", dataListId: "games" },
        { sourceName: "brands", dataListId: "brands" },
      ],
      [],
      { skip: 0, take: 25 },
      formatLabel,
    );

    expect(result.items).toEqual([
      { value: "shared", text: "games: (Shared Game)" },
      { value: "brand-2", text: "brands: (Brand 2)" },
    ]);
  });

  it("continues loading from healthy sources when one source fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, dataListId, params) => {
        if (dataListId === "games") {
          return ApiResult.authError("Games unavailable");
        }

        return mockSource(
          "brands",
          params,
          [{ value: "brand-1", text: "Brand 1" }],
          1,
        );
      },
    );

    const result = await loadChoicesInCreator(
      deps,
      [
        { sourceName: "games", dataListId: "games" },
        { sourceName: "brands", dataListId: "brands" },
      ],
      [],
      { skip: 0, take: 25 },
      formatLabel,
    );

    expect(result.items).toEqual([
      { value: "brand-1", text: "brands: (Brand 1)" },
    ]);
    expect(result.total).toBe(1);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("merges static choices before paging into data-list sources", async () => {
    vi.mocked(searchDataListChoices).mockImplementation(
      async (_deps, _dataListId, params) =>
        mockSource("games", params, [{ value: "game-1", text: "Game 1" }], 400),
    );

    const result = await loadChoicesInCreator(
      deps,
      [{ sourceName: "games", dataListId: "games" }],
      [
        { value: "static-a", text: "static-a" },
        { value: "static-b", text: "static-b" },
        { value: "static-c", text: "static-c" },
      ],
      { skip: 2, take: 25 },
      formatLabel,
    );

    expect(result.items[0]).toEqual({ value: "static-c", text: "static-c" });
    expect(result.items[1]).toEqual({
      value: "game-1",
      text: "games: (Game 1)",
    });
    expect(result.total).toBe(403);
    expect(searchDataListChoices).toHaveBeenCalledWith(
      deps,
      "games",
      expect.objectContaining({ skip: 0, take: 24 }),
    );
  });
});
