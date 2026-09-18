import { describe, expect, it } from "vitest";
import {
  mapSurveyThemeToPdfTheme,
  parseThemeJson,
} from "../map-survey-theme-to-pdf-theme";
import { DEFAULT_PDF_THEME } from "../pdf-theme";
import { endatixSurveyThemeLight } from "@/lib/themes/endatix-themes";

describe("parseThemeJson", () => {
  it("returns undefined for empty or invalid JSON", () => {
    expect(parseThemeJson(undefined)).toBeUndefined();
    expect(parseThemeJson("")).toBeUndefined();
    expect(parseThemeJson("{")).toBeUndefined();
  });

  it("parses an object", () => {
    expect(parseThemeJson('{"themeName":"sharp"}')).toEqual({
      themeName: "sharp",
    });
  });
});

describe("mapSurveyThemeToPdfTheme", () => {
  it("falls back to DEFAULT_PDF_THEME when cssVariables are missing", () => {
    expect(mapSurveyThemeToPdfTheme(undefined)).toEqual(DEFAULT_PDF_THEME);
    expect(mapSurveyThemeToPdfTheme({})).toEqual(DEFAULT_PDF_THEME);
  });

  it("maps Endatix survey light to the default print palette", () => {
    expect(mapSurveyThemeToPdfTheme(endatixSurveyThemeLight)).toEqual(
      DEFAULT_PDF_THEME,
    );
  });

  it("composites rgba alpha and uses survey-canvas / editor tokens", () => {
    expect(
      mapSurveyThemeToPdfTheme({
        cssVariables: {
          "--sjs2-color-utility-surface-survey": "rgba(243, 243, 243, 1)",
          "--sjs-general-backcolor": "rgba(255, 255, 255, 1)",
          "--sjs-editorpanel-backcolor": "rgba(217, 217, 217, 1)",
          "--sjs-primary-backcolor": "rgba(15, 192, 252, 1)",
          "--sjs-primary-forecolor": "rgba(255, 255, 255, 1)",
          "--sjs-general-forecolor": "rgba(30, 30, 30, 1)",
          "--sjs-general-forecolor-light": "rgba(30, 30, 30, 0.45)",
          "--sjs-border-default": "rgba(218, 218, 218, 1)",
          "--sjs-special-green": "#00A650",
          "--sjs-special-red": "rgba(229, 10, 62, 1)",
          "--sjs-corner-radius": "10px",
          "--sjs-font-size": "15px",
        },
      }),
    ).toMatchObject({
      pageBackground: "#f3f3f3",
      surface: "#ffffff",
      inputBackground: "#d9d9d9",
      primary: "#0fc0fc",
      onPrimary: "#ffffff",
      text: "#1e1e1e",
      mutedText: "#9a9a9a",
      border: "#dadada",
      positive: "#00a650",
      negative: "#e50a3e",
      radius: 10,
      fontSize: 12,
    });
  });

  it("prefers explicit hex over Hub fallbacks", () => {
    expect(
      mapSurveyThemeToPdfTheme({
        cssVariables: {
          "--sjs2-color-project-brand-600": "#22aa33",
          "--sjs2-color-utility-surface-survey": "#111111",
          "--sjs2-color-bg-basic-primary": "#222222",
          "--sjs2-color-fg-basic-primary": "#eeeeee",
          "--sjs2-color-fg-basic-secondary": "#aaaaaa",
          "--sjs2-color-border-basic-secondary": "#333333",
          "--sjs2-base-unit-radius": "8px",
          "--sjs2-color-component-formbox-default-bg": "#444444",
        },
      }),
    ).toMatchObject({
      pageBackground: "#111111",
      surface: "#222222",
      inputBackground: "#444444",
      primary: "#22aa33",
      text: "#eeeeee",
      mutedText: "#aaaaaa",
      border: "#333333",
      radius: 8,
    });
  });

  it("resolves var() through Hub token fallbacks", () => {
    const theme = mapSurveyThemeToPdfTheme({
      cssVariables: {
        "--sjs2-color-project-brand-600": "var(--primary, hsl(216 100% 41%))",
      },
    });
    expect(theme.primary).toBe(DEFAULT_PDF_THEME.primary);
  });
});
