import { describe, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { loadChoicesInCreator } from "../load-choices-in-creator";
import { searchDataListChoices } from "../search-data-lists/search-data-list-choices";

vi.mock("../search-data-lists/search-data-list-choices", () => ({
  searchDataListChoices: vi.fn(),
}));

const formatLabel = (sourceName: string, value: string, text: string) =>
  `${sourceName}: (${text || value})`;

describe("loadChoicesInCreator with a choice source in the deps", () => {
  it("reads data-list sources from the deps' choice source when one is set", async () => {
    const searchChoices = vi
      .fn()
      .mockResolvedValue(
        ApiResult.success({ items: [{ value: "x", text: "X" }], total: 1 }),
      );
    const designerDeps: ExtensionRuntimeDeps = {
      getRuntimeState: () => ({}),
      dataListChoices: {
        searchChoices,
        resolveDisplayValues: vi.fn(),
      },
    };

    const result = await loadChoicesInCreator(
      designerDeps,
      [{ sourceName: "cities", dataListId: "42" }],
      [],
      { skip: 0, take: 25 },
      formatLabel,
    );

    expect(searchChoices).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ skip: 0, take: 25 }),
    );
    expect(searchDataListChoices).not.toHaveBeenCalled();
    expect(result.items).toEqual([{ value: "x", text: "cities: (X)" }]);
  });
});
