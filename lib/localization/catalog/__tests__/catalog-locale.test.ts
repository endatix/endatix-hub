import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  toCatalogLocales,
  toSurveyModelLocale,
} from "../catalog-locale";
import {
  isCatalogDefaultLocaleKey,
  isValidCultureCode,
  normalizeCultureCode,
  normalizeCultureCodes,
  normalizeOptionalCultureTag,
  resolveCatalogDefaultLabelText,
  tryNormalizeCultureCode,
} from "../culture-code";

describe("catalog-locale", () => {
  it("maps catalog default to empty survey model locale and back", () => {
    expect(toSurveyModelLocale(DEFAULT_CATALOG_LOCALE)).toBe("");
    expect(toSurveyModelLocale("en")).toBe("");
    expect(toSurveyModelLocale("")).toBe("");
    expect(fromSurveyModelLocale("")).toBe(DEFAULT_CATALOG_LOCALE);
    expect(fromSurveyModelLocale("en")).toBe(DEFAULT_CATALOG_LOCALE);
    expect(fromSurveyModelLocale("default")).toBe(DEFAULT_CATALOG_LOCALE);
  });

  it("preserves non-default cultures", () => {
    expect(toSurveyModelLocale("bg")).toBe("bg");
    expect(fromSurveyModelLocale("bg")).toBe("bg");
    expect(isDefaultCatalogLocale("bg")).toBe(false);
  });

  it("normalizes getUsedLocales-style lists to catalog codes", () => {
    expect(toCatalogLocales(["en", "bg", "en"])).toEqual(["default", "bg"]);
    expect(toCatalogLocales(["bg", "default"])).toEqual(["bg", "default"]);
  });
});

describe("culture-code", () => {
  it("normalizes optional culture tags", () => {
    expect(normalizeOptionalCultureTag(undefined)).toBeUndefined();
    expect(normalizeOptionalCultureTag("  ")).toBeUndefined();
    expect(normalizeOptionalCultureTag(" EN-US ")).toBe("en-us");
  });

  it("validates and normalizes culture codes", () => {
    expect(isValidCultureCode("en-US")).toBe(true);
    expect(isValidCultureCode("!!!")).toBe(false);
    expect(normalizeCultureCode("en-US")).toBe("en-us");
    expect(normalizeCultureCode("default")).toBe(DEFAULT_CATALOG_LOCALE);
  });

  it("maps default label and catalog default culture to default key", () => {
    expect(isCatalogDefaultLocaleKey("default")).toBe(true);
    expect(isCatalogDefaultLocaleKey("en", "en")).toBe(true);
    expect(isCatalogDefaultLocaleKey("en", " EN ")).toBe(true);
    expect(isCatalogDefaultLocaleKey("bg", "en")).toBe(false);
    expect(isCatalogDefaultLocaleKey("en")).toBe(false);
  });

  it("resolves catalog default label text from default or culture alias", () => {
    expect(resolveCatalogDefaultLabelText({ default: " Apple " }, "en")).toBe(
      "Apple",
    );
    expect(
      resolveCatalogDefaultLabelText({ en: "Apple", es: "Manzana" }, "en"),
    ).toBe("Apple");
    expect(resolveCatalogDefaultLabelText({ es: "Manzana" }, "en")).toBeNull();
  });

  it("normalizes culture code lists and reports the first invalid entry", () => {
    expect(tryNormalizeCultureCode("EN-US")).toBe("en-us");
    expect(tryNormalizeCultureCode("!!!")).toBeNull();

    expect(normalizeCultureCodes(["ES", "en-US"])).toEqual({
      ok: true,
      value: ["es", "en-us"],
    });
    expect(normalizeCultureCodes(["es", "!!!"])).toEqual({
      ok: false,
      invalid: "!!!",
    });
  });
});
