import { describe, expect, it } from "vitest";
import {
  discoverLocalesFromTranslationsCsv,
  filterTranslationsCsv,
  readCsvRecords,
} from "../parse-translations-csv";

describe("readCsvRecords", () => {
  it("parses quoted fields that end at a comma or record terminator", () => {
    expect(readCsvRecords('value,default\r\n"a","Apple"\r\n')).toEqual([
      ["value", "default"],
      ["a", "Apple"],
    ]);
  });

  it("rejects trailing text after a closing quote", () => {
    expect(() =>
      readCsvRecords('value,default\r\n"a","Apple"junk\r\n'),
    ).toThrow("Unexpected text after a quoted CSV field.");
  });

  it("surfaces trailing text after a quote as a structural discovery error", () => {
    const discovery = discoverLocalesFromTranslationsCsv(
      'value,default\r\napple,"Apple"junk\r\n',
      { availableLocales: [], defaultLocale: "en" },
    );

    expect(discovery.canProceed).toBe(false);
    expect(discovery.structuralErrors).toContain(
      "Unexpected text after a quoted CSV field.",
    );
  });

  it("strips a leading BOM", () => {
    expect(readCsvRecords("\uFEFFvalue,default\r\na,A\r\n")).toEqual([
      ["value", "default"],
      ["a", "A"],
    ]);
  });
});

describe("filterTranslationsCsv", () => {
  const source =
    "value,default,es,bg\r\napple,Apple,Manzana,Ябълка\r\npear,Pear,Pera,Круша\r\n";

  it("keeps default and selected locale columns", () => {
    const filtered = filterTranslationsCsv(source, ["default", "es"]);

    expect(readCsvRecords(filtered)).toEqual([
      ["value", "default", "es"],
      ["apple", "Apple", "Manzana"],
      ["pear", "Pear", "Pera"],
    ]);
  });

  it("always retains the default column even when omitted from selection", () => {
    const filtered = filterTranslationsCsv(source, ["bg"]);

    expect(readCsvRecords(filtered)[0]).toEqual(["value", "default", "bg"]);
  });

  it("maps defaultLocale culture alias to the default catalog column", () => {
    const withEn = "value,en,es\r\napple,Apple,Manzana\r\npear,Pear,Pera\r\n";
    const filtered = filterTranslationsCsv(withEn, ["es"], "en");

    expect(readCsvRecords(filtered)).toEqual([
      ["value", "en", "es"],
      ["apple", "Apple", "Manzana"],
      ["pear", "Pear", "Pera"],
    ]);
  });

  it("drops duplicate locale columns after the first canonical key", () => {
    const duplicate =
      "value,default,ES,es\r\napple,Apple,Manzana1,Manzana2\r\n";
    const filtered = filterTranslationsCsv(duplicate, ["default", "es"]);

    expect(readCsvRecords(filtered)).toEqual([
      ["value", "default", "ES"],
      ["apple", "Apple", "Manzana1"],
    ]);
  });
});
