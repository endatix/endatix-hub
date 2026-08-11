import { describe, expect, it } from "vitest";
import {
  discoverLocalesFromTranslationsCsv,
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
});
