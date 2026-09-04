import { describe, expect, it } from "vitest";
import {
  DEFAULT_CREATOR_TAB,
  ENDATIX_CREATOR_TAB,
  SURVEY_CREATOR_BUILT_IN_TAB,
  canonicalizeCreatorTabId,
  parseCreatorTabUrlSlug,
  serializeCreatorTabUrlSlug,
} from "../index";

describe("canonicalizeCreatorTabId", () => {
  it("keeps built-in and Hub plugin ids", () => {
    expect(canonicalizeCreatorTabId("designer")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.designer,
    );
    expect(canonicalizeCreatorTabId("form-diagnostics")).toBe(
      ENDATIX_CREATOR_TAB.diagnostics,
    );
  });

  it("maps the legacy ids Creator still emits", () => {
    expect(canonicalizeCreatorTabId("test")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(canonicalizeCreatorTabId("editor")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.json,
    );
  });

  it("rejects unknown ids", () => {
    expect(canonicalizeCreatorTabId("not-a-tab")).toBeNull();
  });
});

describe("parseCreatorTabUrlSlug", () => {
  it("defaults to Design when the query is missing or unknown", () => {
    expect(parseCreatorTabUrlSlug(null)).toBe(DEFAULT_CREATOR_TAB);
    expect(parseCreatorTabUrlSlug(undefined)).toBe(DEFAULT_CREATOR_TAB);
    expect(parseCreatorTabUrlSlug("  ")).toBe(DEFAULT_CREATOR_TAB);
    expect(parseCreatorTabUrlSlug("not-a-tab")).toBe(DEFAULT_CREATOR_TAB);
  });

  it("maps canonical slugs onto Creator tab ids", () => {
    expect(parseCreatorTabUrlSlug("preview")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(parseCreatorTabUrlSlug("json")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.json,
    );
    expect(parseCreatorTabUrlSlug("diagnostics")).toBe(
      ENDATIX_CREATOR_TAB.diagnostics,
    );
  });

  it("accepts aliases case-insensitively", () => {
    expect(parseCreatorTabUrlSlug("test")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.preview,
    );
    expect(parseCreatorTabUrlSlug("jsonEditor")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.json,
    );
    expect(parseCreatorTabUrlSlug("Themes")).toBe(
      SURVEY_CREATOR_BUILT_IN_TAB.theme,
    );
    expect(parseCreatorTabUrlSlug("form-diagnostics")).toBe(
      ENDATIX_CREATOR_TAB.diagnostics,
    );
  });
});

describe("serializeCreatorTabUrlSlug", () => {
  it("omits the query for Design", () => {
    expect(serializeCreatorTabUrlSlug(DEFAULT_CREATOR_TAB)).toBeNull();
  });

  it("writes canonical slugs for every other tab", () => {
    expect(serializeCreatorTabUrlSlug(ENDATIX_CREATOR_TAB.preview)).toBe(
      "preview",
    );
    expect(serializeCreatorTabUrlSlug(ENDATIX_CREATOR_TAB.diagnostics)).toBe(
      "diagnostics",
    );
  });

  it("round-trips every tab id", () => {
    for (const tabId of Object.values(ENDATIX_CREATOR_TAB)) {
      expect(parseCreatorTabUrlSlug(serializeCreatorTabUrlSlug(tabId))).toBe(
        tabId,
      );
    }
  });
});
