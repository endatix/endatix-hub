import { describe, expect, it } from "vitest";
import { resolvePdfCatalogLocale } from "../resolve-pdf-catalog-locale";

const used = ["en", "pt", "bg"];

describe("resolvePdfCatalogLocale", () => {
  it("uses an explicit catalog locale when the survey includes it", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: used,
        submissionLocale: "bg",
        requestedLocale: "pt",
      }),
    ).toEqual({ catalogLocale: "pt", source: "explicit" });
  });

  it("treats the catalog default key as an explicit choice", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: used,
        requestedLocale: "default",
      }),
    ).toEqual({ catalogLocale: "default", source: "explicit" });
  });

  it("falls back to default when the requested code is not on the survey", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: used,
        submissionLocale: "pt",
        requestedLocale: "fr",
      }),
    ).toEqual({ catalogLocale: "default", source: "default" });
  });

  it("uses the submission language when no locale was requested", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: used,
        submissionLocale: "pt",
      }),
    ).toEqual({ catalogLocale: "pt", source: "submission" });
  });

  it("forces the survey default for legacy defaultLocale links", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: used,
        submissionLocale: "pt",
        requestedLocale: "bg",
        forceDefault: true,
      }),
    ).toEqual({ catalogLocale: "default", source: "default" });
  });

  it("uses default when the survey has a single language", () => {
    expect(
      resolvePdfCatalogLocale({
        usedLocales: ["en"],
        submissionLocale: "pt",
      }),
    ).toEqual({ catalogLocale: "default", source: "default" });
  });
});
