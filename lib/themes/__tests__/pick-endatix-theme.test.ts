import { describe, expect, it } from "vitest";
import { endatixThemeDark, endatixThemeLight } from "../endatix-creator-theme";
import { endatixSurveyThemeDark } from "../endatix-survey-theme-dark";
import { endatixSurveyThemeLight } from "../endatix-survey-theme-light";
import { pickCreatorTheme, pickSurveyTheme } from "../pick-endatix-theme";

describe("pickCreatorTheme", () => {
  it("returns dark theme when resolvedTheme is 'dark'", () => {
    const result = pickCreatorTheme("dark");
    expect(result).toBe(endatixThemeDark);
  });

  it("returns light theme when resolvedTheme is 'light'", () => {
    const result = pickCreatorTheme("light");
    expect(result).toBe(endatixThemeLight);
  });

  it("returns light theme when resolvedTheme is undefined", () => {
    const result = pickCreatorTheme(undefined);
    expect(result).toBe(endatixThemeLight);
  });

  it("returns light theme when resolvedTheme is null", () => {
    const result = pickCreatorTheme(null as unknown as undefined);
    expect(result).toBe(endatixThemeLight);
  });
});

describe("pickSurveyTheme", () => {
  it("returns dark theme when resolvedTheme is 'dark'", () => {
    const result = pickSurveyTheme("dark");
    expect(result).toBe(endatixSurveyThemeDark);
  });

  it("returns light theme when resolvedTheme is 'light'", () => {
    const result = pickSurveyTheme("light");
    expect(result).toBe(endatixSurveyThemeLight);
  });

  it("returns light theme when resolvedTheme is undefined", () => {
    const result = pickSurveyTheme(undefined);
    expect(result).toBe(endatixSurveyThemeLight);
  });

  it("returns light theme when resolvedTheme is null", () => {
    const result = pickSurveyTheme(null as unknown as undefined);
    expect(result).toBe(endatixSurveyThemeLight);
  });
});
