import { describe, expect, it } from "vitest";
import {
  buildDefaultLocaleSelection,
  discoverLocalesFromKeys,
  formatLocaleLabel,
  normalizeCultureCode,
  resolveLocaleImportSelection,
} from "../locale-discovery";
import {
  discoverLocalesFromTranslationsCsv,
  filterTranslationsCsv,
} from "../parse-translations-csv";
import {
  discoverLocalesFromJsonItems,
  filterJsonItemsByLocales,
  validateJsonInput,
} from "../../utils";

describe("locale discovery", () => {
  it("normalizes culture codes to lowercase", () => {
    expect(normalizeCultureCode("en-US")).toBe("en-us");
    expect(normalizeCultureCode("FR")).toBe("fr");
    expect(normalizeCultureCode("default")).toBe("default");
  });

  it("formats labels via surveyLocalization", () => {
    expect(formatLocaleLabel("default")).toBe("default");
    expect(formatLocaleLabel("fr")).toMatch(/^fr · /i);
    expect(formatLocaleLabel("nl-be")).toMatch(/^nl-be · /i);
    expect(formatLocaleLabel("zz-unknown")).toBe("zz-unknown");
  });

  it("classifies csv locales against the catalog", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      "value,default,es,fr\r\napple,Apple,Manzana,Pomme\r\n",
      { availableLocales: [], defaultLocale: "en" },
    );

    expect(discovery.rowCount).toBe(1);
    expect(discovery.existingLocales).toEqual(["default"]);
    expect(discovery.newLocales).toEqual(["es", "fr"]);
    expect(discovery.canProceed).toBe(true);
  });

  it("treats en-US header as en-us", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      "value,default,en-US\r\napple,Apple,Apple US\r\n",
      { availableLocales: ["en-us"], defaultLocale: "en" },
    );

    expect(discovery.columns.map((c) => c.key)).toEqual(["default", "en-us"]);
    expect(discovery.existingLocales).toContain("en-us");
    expect(discovery.newLocales).toEqual([]);
  });

  it("marks unknown columns as invalid", () => {
    const discovery = discoverLocalesFromKeys(
      ["default", "!!!"],
      {
        availableLocales: [],
        defaultLocale: "en",
      },
      1,
    );

    expect(discovery.invalidLocales).toContain("!!!");
    expect(discovery.canProceed).toBe(false);
  });

  it("rejects case-only duplicate locale columns", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      "value,default,es,ES\r\napple,Apple,Manzana,MANZANA\r\n",
      { availableLocales: [], defaultLocale: "en" },
    );

    expect(discovery.canProceed).toBe(false);
    expect(discovery.invalidLocales).toContain("ES");
    expect(discovery.newLocales).toEqual(["es"]);
    expect(
      discovery.columns.filter((column) => column.key === "es"),
    ).toHaveLength(1);

    const filtered = filterTranslationsCsv(
      "value,default,es,ES\r\napple,Apple,Manzana,MANZANA\r\n",
      ["default", "es"],
      "en",
    );
    expect(filtered).toBe("value,default,es\r\napple,Apple,Manzana\r\n");
  });

  it("rejects duplicate columns that alias to the default locale", () => {
    const discovery = discoverLocalesFromKeys(
      ["default", "en", "es"],
      { availableLocales: [], defaultLocale: "en" },
      1,
    );

    expect(discovery.canProceed).toBe(false);
    expect(discovery.invalidLocales).toContain("en");
    expect(
      discovery.columns.filter((column) => column.kind === "default"),
    ).toHaveLength(1);
    expect(discovery.newLocales).toEqual(["es"]);
  });

  it("accepts multilingual json items", () => {
    const result = validateJsonInput(
      JSON.stringify([
        {
          value: "apple",
          labels: { default: "Apple", es: "Manzana" },
        },
      ]),
    );

    expect(result.errors).toEqual([]);
    expect(result.validItems).toHaveLength(1);
    expect(result.validItems[0].labels?.es).toBe("Manzana");

    const discovery = discoverLocalesFromJsonItems(result.validItems, {
      availableLocales: [],
      defaultLocale: "en",
    });
    expect(discovery.newLocales).toEqual(["es"]);
  });
});

describe("locale import selection and strip", () => {
  it("defaults all valid columns on and locks default", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      "value,default,es,fr\r\napple,Apple,Manzana,Pomme\r\n",
      { availableLocales: ["es"], defaultLocale: "en" },
    );

    const selected = buildDefaultLocaleSelection(discovery);
    expect(selected.default).toBe(true);
    expect(selected.es).toBe(true);
    expect(selected.fr).toBe(true);

    const { selection, errors } = resolveLocaleImportSelection(
      discovery,
      { ...selected, fr: false },
      1,
    );

    expect(errors).toEqual([]);
    expect(selection.includedLocales.sort()).toEqual(["default", "es"]);
    expect(selection.ensureLocales).toEqual([]);
  });

  it("ensures only newly selected cultures", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      "value,default,es,fr\r\napple,Apple,Manzana,Pomme\r\n",
      { availableLocales: [], defaultLocale: "en" },
    );

    const { selection } = resolveLocaleImportSelection(
      discovery,
      buildDefaultLocaleSelection(discovery),
      0,
    );

    expect(selection.ensureLocales.sort()).toEqual(["es", "fr"]);
  });

  it("strips deselected csv columns before upload", () => {
    const csv = "value,default,es,fr\r\napple,Apple,Manzana,Pomme\r\n";
    const filtered = filterTranslationsCsv(csv, ["default", "es"], "en");

    expect(filtered).toContain("value,default,es");
    expect(filtered).not.toContain(",fr");
    expect(filtered).toContain("Apple");
    expect(filtered).toContain("Manzana");
    expect(filtered).not.toContain("Pomme");
  });

  it("strips deselected json label keys before upload", () => {
    const items = [
      {
        value: "apple",
        labels: { default: "Apple", es: "Manzana", fr: "Pomme" },
      },
    ];

    const filtered = filterJsonItemsByLocales(items, ["default", "es"]);
    expect(filtered[0].labels).toEqual({
      default: "Apple",
      es: "Manzana",
    });
  });
});
