import { describe, expect, it } from "vitest";
import {
  DEFAULT_CREATOR_TAB,
  ENDATIX_CREATOR_TAB,
  SURVEY_CREATOR_BUILT_IN_TAB,
  parseCreatorTabUrlSlug,
  serializeCreatorTabUrlSlug,
} from "../index";

describe("survey-js creator tabs", () => {
  it("includes Survey Creator built-in plugin names", () => {
    expect(SURVEY_CREATOR_BUILT_IN_TAB).toEqual({
      designer: "designer",
      preview: "preview",
      theme: "theme",
      json: "json",
      translation: "translation",
      logic: "logic",
    });
  });

  it("extends built-ins with the diagnostics plugin id", () => {
    expect(ENDATIX_CREATOR_TAB.diagnostics).toBe("form-diagnostics");
    expect(ENDATIX_CREATOR_TAB.designer).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
  });
});

describe("parseCreatorTabUrlSlug", () => {
  it("defaults to designer when the query is missing", () => {
    expect(parseCreatorTabUrlSlug(null)).toBe(DEFAULT_CREATOR_TAB);
    expect(parseCreatorTabUrlSlug(undefined)).toBe(DEFAULT_CREATOR_TAB);
    expect(parseCreatorTabUrlSlug("")).toBe(DEFAULT_CREATOR_TAB);
  });

  it("maps canonical slugs onto Creator tab ids", () => {
    expect(parseCreatorTabUrlSlug("preview")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(parseCreatorTabUrlSlug("theme")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.theme,
    );
    expect(parseCreatorTabUrlSlug("json")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.json,
    );
    expect(parseCreatorTabUrlSlug("diagnostics")).toBe(
      ENDATIX_CREATOR_TAB.diagnostics,
    );
  });

  it("accepts aliases and unknown values fall back to designer", () => {
    expect(parseCreatorTabUrlSlug("test")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(parseCreatorTabUrlSlug("jsonEditor")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.json,
    );
    expect(parseCreatorTabUrlSlug("themes")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.theme,
    );
    expect(parseCreatorTabUrlSlug("not-a-tab")).toBe(DEFAULT_CREATOR_TAB);
  });
});

describe("serializeCreatorTabUrlSlug", () => {
  it("omits the query for Design", () => {
    expect(serializeCreatorTabUrlSlug(DEFAULT_CREATOR_TAB)).toBeNull();
  });

  it("writes canonical slugs for other tabs", () => {
    expect(
      serializeCreatorTabUrlSlug(SURVEY_CREATOR_BUILT_IN_TAB.preview),
    ).toBe("preview");
    expect(serializeCreatorTabUrlSlug(ENDATIX_CREATOR_TAB.diagnostics)).toBe(
      "diagnostics",
    );
  });
});
