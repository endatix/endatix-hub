import { describe, expect, it } from "vitest";
import {
  DATA_LIST_LOCALE_NOT_TRANSLATED,
  DATA_LIST_LOCALE_TRANSLATED,
  DATA_LIST_TRANSLATION_HELP,
  buildDataListDetailsPath,
  dataListLocaleStatus,
  formatDataListTranslationGroupTitle,
} from "../data-list-translation-group-header";

describe("data list translation group header", () => {
  it("builds a hub details path for the list id", () => {
    expect(buildDataListDetailsPath("42")).toBe("/data-lists/42");
  });

  it("formats a single-line panel title with name and item count", () => {
    const title = formatDataListTranslationGroupTitle({
      dataListId: "7",
      name: "Cities",
      itemsCount: 12,
      availableLocales: [],
      items: [],
    });

    expect(title).toBe(`Cities (${(12).toLocaleString()} items)`);
  });

  it("groups thousands in the item count", () => {
    const title = formatDataListTranslationGroupTitle({
      dataListId: "7",
      name: "Cities",
      itemsCount: 5000,
      availableLocales: [],
      items: [],
    });

    expect(title).toBe(`Cities (${(5000).toLocaleString()} items)`);
  });

  it("uses singular item label when the list has one row", () => {
    const title = formatDataListTranslationGroupTitle({
      dataListId: "99",
      name: "Cities",
      itemsCount: 1,
      availableLocales: [],
      items: [],
    });

    expect(title).toBe("Cities (1 item)");
  });

  it("falls back to the list id when name is missing", () => {
    const title = formatDataListTranslationGroupTitle({
      dataListId: "99",
      availableLocales: [],
      items: [],
    });

    expect(title).toContain("Data list 99");
  });

  it("marks the default locale as translated and extra cultures from availableLocales", () => {
    const catalog = {
      availableLocales: ["bg"],
      defaultLocale: "en",
    };

    expect(dataListLocaleStatus(catalog, "")).toBe(DATA_LIST_LOCALE_TRANSLATED);
    expect(dataListLocaleStatus(catalog, "bg")).toBe(
      DATA_LIST_LOCALE_TRANSLATED,
    );
    expect(dataListLocaleStatus(catalog, "de")).toBe(
      DATA_LIST_LOCALE_NOT_TRANSLATED,
    );
    expect(DATA_LIST_TRANSLATION_HELP).toContain("not shown here");
  });
});
