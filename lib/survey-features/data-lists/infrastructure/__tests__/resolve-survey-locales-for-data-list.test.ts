import { describe, expect, it } from "vitest";
import { resolveSurveyLocalesForDataList } from "../resolve-survey-locales-for-data-list";

describe("resolveSurveyLocalesForDataList", () => {
  it("includes default and catalog locales, normalizing SurveyJS en", () => {
    const result = resolveSurveyLocalesForDataList(
      {
        locale: "bg",
        getUsedLocales: () => ["bg", "en"],
      },
      { getLocale: () => "bg" },
    );

    expect(result.locale).toBe("bg");
    expect(result.includeLocales).toEqual(["default", "bg"]);
  });

  it("treats active en as survey default (no API locale)", () => {
    const result = resolveSurveyLocalesForDataList(
      {
        locale: "en",
        getUsedLocales: () => ["en", "bg"],
      },
      { getLocale: () => "en" },
    );

    expect(result.locale).toBeUndefined();
    expect(result.includeLocales).toEqual(["default", "bg"]);
  });

  it("falls back to model.locale when question locale is empty", () => {
    const result = resolveSurveyLocalesForDataList(
      {
        locale: "es",
        getUsedLocales: () => ["es", "fr"],
      },
      { getLocale: () => "" },
    );

    expect(result.locale).toBe("es");
    expect(result.includeLocales).toEqual(["default", "es", "fr"]);
  });

  it("still projects used locales when no active locale is set", () => {
    const result = resolveSurveyLocalesForDataList(
      {
        locale: "",
        getUsedLocales: () => ["bg"],
      },
      { getLocale: () => "default" },
    );

    expect(result.locale).toBeUndefined();
    expect(result.includeLocales).toEqual(["default", "bg"]);
  });
});
