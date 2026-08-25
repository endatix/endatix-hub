import { describe, expect, it } from "vitest";
import { collectCatalogLocales } from "../catalog-locales";
import type { DataList } from "@/lib/endatix-api/data-lists/types";

function list(partial: Partial<DataList>): DataList {
  return {
    id: "1",
    name: "List",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    itemsCount: 0,
    ...partial,
  };
}

describe("collectCatalogLocales", () => {
  it("unions default and available locales, sorted, unique", () => {
    const locales = collectCatalogLocales([
      list({ defaultLocale: "es", availableLocales: ["en", "es"] }),
      list({ defaultLocale: "de", availableLocales: ["en"] }),
    ]);

    expect(locales).toEqual(["de", "en", "es"]);
  });

  it("skips missing default and empty availableLocales", () => {
    expect(
      collectCatalogLocales([
        list({ availableLocales: undefined }),
        list({ defaultLocale: "", availableLocales: [] }),
      ]),
    ).toEqual([]);
  });
});
