import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
  toCatalogLocales,
  toSurveyModelLocale,
} from "../catalog-locale";

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
