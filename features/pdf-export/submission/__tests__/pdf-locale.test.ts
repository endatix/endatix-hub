import { describe, expect, it } from "vitest";
import { parsePdfLocaleQuery, resolvePdfLocale } from "../pdf-locale";

const used = ["en", "pt", "bg"];

describe("parsePdfLocaleQuery", () => {
  it("reads locale and the legacy defaultLocale flag", () => {
    expect(
      parsePdfLocaleQuery(new URLSearchParams("locale=pt&defaultLocale=true")),
    ).toEqual({ requestedLocale: "pt", forceDefault: true });
    expect(parsePdfLocaleQuery(new URLSearchParams())).toEqual({
      requestedLocale: undefined,
      forceDefault: false,
    });
  });
});

describe("resolvePdfLocale", () => {
  it("uses an explicit locale when the survey includes it", () => {
    expect(resolvePdfLocale(used, "bg", { requestedLocale: "pt" })).toEqual({
      catalogLocale: "pt",
      source: "explicit",
    });
  });

  it("treats the catalog default key as an explicit choice", () => {
    expect(
      resolvePdfLocale(used, undefined, { requestedLocale: "default" }),
    ).toEqual({ catalogLocale: "default", source: "explicit" });
  });

  it("falls back to default when the requested code is not on the survey", () => {
    expect(resolvePdfLocale(used, "pt", { requestedLocale: "fr" })).toEqual({
      catalogLocale: "default",
      source: "default",
    });
  });

  it("treats a blank locale as not requested", () => {
    expect(resolvePdfLocale(used, "pt", { requestedLocale: " " })).toEqual({
      catalogLocale: "pt",
      source: "submission",
    });
  });

  it("uses the submission language when no locale was requested", () => {
    expect(resolvePdfLocale(used, "pt")).toEqual({
      catalogLocale: "pt",
      source: "submission",
    });
  });

  it("forces the survey default for legacy defaultLocale links", () => {
    expect(
      resolvePdfLocale(used, "pt", {
        requestedLocale: "bg",
        forceDefault: true,
      }),
    ).toEqual({ catalogLocale: "default", source: "default" });
  });

  it("uses default when the submitted language is not on the survey", () => {
    expect(resolvePdfLocale(["en"], "pt")).toEqual({
      catalogLocale: "default",
      source: "default",
    });
  });
});
