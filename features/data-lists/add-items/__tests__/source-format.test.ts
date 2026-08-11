import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CSV_TEMPLATE_HREF,
  JSON_TEMPLATE_HREF,
} from "../data-list-items-input";
import { discoverLocalesFromTranslationsCsv } from "../../translations/parse-translations-csv";
import { serializeDataListItemsJson } from "../../utils";

describe("data list source templates", () => {
  it("exposes format-specific template hrefs", () => {
    expect(JSON_TEMPLATE_HREF).toBe("/templates/data-list-template.json");
    expect(CSV_TEMPLATE_HREF).toBe("/templates/data-list-template.csv");
  });

  it("ships a CSV template parseable by translations discovery", () => {
    const csvPath = resolve(
      process.cwd(),
      "public/templates/data-list-template.csv",
    );
    const csv = readFileSync(csvPath, "utf8");
    const discovery = discoverLocalesFromTranslationsCsv(csv, {
      availableLocales: [],
      defaultLocale: "en",
    });

    expect(discovery.canProceed).toBe(true);
    expect(discovery.rowCount).toBe(2);
    expect(discovery.newLocales.sort()).toEqual(["es", "fr"]);
  });
});

describe("serializeDataListItemsJson", () => {
  it("round-trips labels map shape used by the JSON template", () => {
    const json = serializeDataListItemsJson([
      {
        value: "apple",
        labels: { default: "Apple", es: "Manzana" },
      },
      { value: "banana", labels: { default: "Banana" } },
    ]);

    const parsed = JSON.parse(json) as Array<{
      value: string;
      labels: Record<string, string>;
    }>;

    expect(parsed).toHaveLength(2);
    expect(parsed[0].labels.es).toBe("Manzana");
    expect(parsed[1].labels.default).toBe("Banana");
  });
});
