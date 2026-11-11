import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { designerDataListChoiceSource } from "../designer-data-list-choice-source";
import { resolveDataListItemLabelsAction } from "../resolve-data-list-item-labels.action";
import { searchDataListItemsAction } from "../search-data-list-items.action";

vi.mock("../search-data-list-items.action", () => ({
  searchDataListItemsAction: vi.fn(),
}));
vi.mock("../resolve-data-list-item-labels.action", () => ({
  resolveDataListItemLabelsAction: vi.fn(),
}));

describe("designerDataListChoiceSource", () => {
  beforeEach(() => {
    vi.mocked(searchDataListItemsAction).mockReset();
    vi.mocked(resolveDataListItemLabelsAction).mockReset();
  });

  it("searches the staff items window and maps labels to SurveyJS text", async () => {
    vi.mocked(searchDataListItemsAction).mockResolvedValue(
      Result.success({
        items: [{ value: "sofia", labels: { default: "Sofia", bg: "София" } }],
        totalRecords: 30,
      }),
    );

    const response = await designerDataListChoiceSource.searchChoices("42", {
      filter: " So ",
      searchMode: "startsWith",
      locale: "bg",
      includeLocales: ["bg"],
      skip: 25,
      take: 25,
    });

    expect(searchDataListItemsAction).toHaveBeenCalledWith("42", {
      query: "So",
      matchMode: "StartsWith",
      locale: "bg",
      includeLocales: ["bg"],
      skip: 25,
      take: 25,
    });
    expect(response).toEqual({
      success: true,
      data: {
        items: [{ value: "sofia", text: { default: "Sofia", bg: "София" } }],
        total: 30,
      },
    });
  });

  it("sends no query for an empty filter", async () => {
    vi.mocked(searchDataListItemsAction).mockResolvedValue(
      Result.success({ items: [], totalRecords: 0 }),
    );

    await designerDataListChoiceSource.searchChoices("42", {
      filter: "",
      skip: 0,
      take: 25,
    });

    expect(searchDataListItemsAction).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ query: undefined, matchMode: undefined }),
    );
  });

  it("returns an error result when the staff search fails", async () => {
    vi.mocked(searchDataListItemsAction).mockResolvedValue(
      Result.error("Forbidden"),
    );

    const response = await designerDataListChoiceSource.searchChoices("42", {
      skip: 0,
      take: 25,
    });

    expect(response.success).toBe(false);
  });

  it("maps every requested value, falling back to the value for one the list lacks", async () => {
    vi.mocked(resolveDataListItemLabelsAction).mockResolvedValue(
      Result.success([{ value: "sofia", labels: { default: "Sofia" } }]),
    );

    const response = await designerDataListChoiceSource.resolveDisplayValues(
      "42",
      ["sofia", "sofia", "gone"],
      { locale: "bg" },
    );

    expect(resolveDataListItemLabelsAction).toHaveBeenCalledWith(
      "42",
      ["sofia", "gone"],
      { locale: "bg" },
    );
    expect(response.success).toBe(true);
    if (response.success) {
      expect([...response.data]).toEqual([
        ["sofia", { default: "Sofia" }],
        ["gone", { default: "gone" }],
      ]);
    }
  });
});
