import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import {
  guardEnsureLocalesCount,
  guardImportPayload,
  guardJsonImportItems,
  guardTranslationsCsvPayload,
} from "../import-payload-guards";
import {
  DATA_LIST_MAX_CSV_CHARS,
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LOCALES,
} from "../import-limits";
import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";

function expectErrorMessage(result: Result<unknown>, fragment: string): void {
  expect(Result.isError(result)).toBe(true);
  if (!Result.isError(result)) {
    return;
  }
  expect(result.message).toContain(fragment);
}

function buildCsv(rowCount: number): string {
  const rows = Array.from(
    { length: rowCount },
    (_, index) => `v${index},Label ${index}`,
  );
  return `value,default\r\n${rows.join("\r\n")}\r\n`;
}

function buildItems(count: number): DataListChoiceItem[] {
  return Array.from({ length: count }, (_, index) => ({
    value: `v${index}`,
    labels: { default: `Label ${index}` },
  }));
}

describe("guardTranslationsCsvPayload", () => {
  it("rejects oversized csv payloads", () => {
    expectErrorMessage(
      guardTranslationsCsvPayload("x".repeat(DATA_LIST_MAX_CSV_CHARS + 1)),
      DATA_LIST_MAX_CSV_CHARS.toLocaleString("en-US"),
    );
  });

  it("rejects csv without data rows", () => {
    expectErrorMessage(
      guardTranslationsCsvPayload("value,default\r\n"),
      "At least one data row",
    );
  });

  it("rejects csv that only has blank rows after the header", () => {
    expectErrorMessage(
      guardTranslationsCsvPayload("value,default\r\n\r\n   \r\n"),
      "At least one data row",
    );
  });

  it("rejects malformed csv that cannot be parsed", () => {
    expectErrorMessage(
      guardTranslationsCsvPayload('value,default\r\n"a","Apple"junk\r\n'),
      "Unexpected text after a quoted CSV field",
    );
  });

  it("rejects csv with more than the max item rows", () => {
    expectErrorMessage(
      guardTranslationsCsvPayload(buildCsv(DATA_LIST_MAX_ITEMS + 1)),
      "5,000",
    );
  });

  it("accepts a minimal valid csv", () => {
    const result = guardTranslationsCsvPayload(
      "value,default\r\napple,Apple\r\n",
    );

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("accepts csv at the max item row count", () => {
    const result = guardTranslationsCsvPayload(buildCsv(DATA_LIST_MAX_ITEMS));

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("maps non-Error parse failures to a generic message", async () => {
    // Arrange
    vi.resetModules();
    vi.doMock("../translations/parse-translations-csv", () => ({
      readCsvRecords: () => {
        throw "boom";
      },
    }));

    const { guardTranslationsCsvPayload: guarded } =
      await import("../import-payload-guards");

    // Act
    const result = guarded("value,default\r\na,A\r\n");

    // Assert
    expectErrorMessage(result, "Invalid CSV format.");
    vi.doUnmock("../translations/parse-translations-csv");
    vi.resetModules();
  });
});

describe("guardJsonImportItems", () => {
  it("rejects empty json item arrays", () => {
    expectErrorMessage(guardJsonImportItems([]), "At least one item");
  });

  it("rejects arrays above the max item count", () => {
    expectErrorMessage(
      guardJsonImportItems(buildItems(DATA_LIST_MAX_ITEMS + 1)),
      "5,000",
    );
  });

  it("accepts a single valid item", () => {
    const result = guardJsonImportItems(buildItems(1));

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("accepts arrays at the max item count", () => {
    const result = guardJsonImportItems(buildItems(DATA_LIST_MAX_ITEMS));

    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("guardEnsureLocalesCount", () => {
  it("rejects ensureLocales that would exceed the catalog cap", () => {
    const ensure = Array.from(
      { length: DATA_LIST_MAX_LOCALES },
      (_, index) => `l${index}`,
    );
    expectErrorMessage(
      guardEnsureLocalesCount(ensure, ["already-there"]),
      String(DATA_LIST_MAX_LOCALES),
    );
  });

  it("accepts ensureLocales that land exactly on the catalog cap", () => {
    const ensure = Array.from({ length: 2 }, (_, index) => `l${index}`);
    const existing = Array.from(
      { length: DATA_LIST_MAX_LOCALES - ensure.length },
      (_, index) => `existing-${index}`,
    );
    const result = guardEnsureLocalesCount(ensure, existing);

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("does not double-count ensureLocales already present in the catalog", () => {
    const existing = Array.from(
      { length: DATA_LIST_MAX_LOCALES },
      (_, index) => `l${index}`,
    );
    const result = guardEnsureLocalesCount(
      [existing[0], existing[1]],
      existing,
    );

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("dedupes ensureLocales before comparing against the catalog cap", () => {
    const existing = Array.from(
      { length: DATA_LIST_MAX_LOCALES - 1 },
      (_, index) => `existing-${index}`,
    );
    const result = guardEnsureLocalesCount(["fr", "FR", " fr "], existing);

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("accepts an empty ensureLocales list", () => {
    const existing = Array.from(
      { length: DATA_LIST_MAX_LOCALES },
      (_, index) => `l${index}`,
    );
    const result = guardEnsureLocalesCount([], existing);

    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("guardImportPayload", () => {
  it("rejects csv payloads via the combined entry point", () => {
    expectErrorMessage(
      guardImportPayload({
        format: "csv",
        csv: "value,default\r\n",
        ensureLocales: [],
        existingCatalogLocales: [],
      }),
      "At least one data row",
    );
  });

  it("rejects json payloads via the combined entry point", () => {
    expectErrorMessage(
      guardImportPayload({
        format: "json",
        items: [],
        ensureLocales: [],
        existingCatalogLocales: [],
      }),
      "At least one item",
    );
  });

  it("rejects ensureLocales before checking payload shape", () => {
    const ensure = Array.from(
      { length: DATA_LIST_MAX_LOCALES },
      (_, index) => `l${index}`,
    );
    expectErrorMessage(
      guardImportPayload({
        format: "json",
        items: buildItems(1),
        ensureLocales: ensure,
        existingCatalogLocales: ["already-there"],
      }),
      String(DATA_LIST_MAX_LOCALES),
    );
  });

  it("accepts a valid csv payload with room for new locales", () => {
    const result = guardImportPayload({
      format: "csv",
      csv: "value,default\r\napple,Apple\r\n",
      ensureLocales: ["fr-FR"],
      existingCatalogLocales: ["en"],
    });

    expect(Result.isSuccess(result)).toBe(true);
  });
});
