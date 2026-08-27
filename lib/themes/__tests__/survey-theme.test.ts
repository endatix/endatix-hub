import { describe, expect, it, vi } from "vitest";
import { DefaultDark, DefaultLight } from "survey-core/themes";
import {
  endatixSurveyThemeDark,
  endatixSurveyThemeLight,
} from "../endatix-themes";
import {
  applyFormSurveyTheme,
  applyHubDashboardTheme,
  relocateSurveyBaseThemeStyles,
  sanitizeSurveyTheme,
} from "../survey-theme";

describe("sanitizeSurveyTheme", () => {
  it("replaces null cssVariables with {}", () => {
    expect(
      sanitizeSurveyTheme({ themeName: "brand", cssVariables: null }),
    ).toEqual({ themeName: "brand", cssVariables: {} });
  });

  it("drops null header so getObjectDiffs does not recurse into null", () => {
    const result = sanitizeSurveyTheme({
      themeName: "brand",
      cssVariables: {},
      header: null,
    });

    expect(result).not.toHaveProperty("header");
  });
});

describe("applyFormSurveyTheme", () => {
  it("layers a stored tenant theme on DefaultLight", () => {
    const model = { applyTheme: vi.fn() };
    const stored = {
      themeName: "brand",
      cssVariables: { "--sjs-primary-backcolor": "#000" },
    };

    applyFormSurveyTheme(model as never, stored);

    expect(model.applyTheme).toHaveBeenCalledWith(stored, DefaultLight);
  });

  it("falls back to the Endatix survey theme when the form has none", () => {
    const model = { applyTheme: vi.fn() };

    applyFormSurveyTheme(model as never);

    expect(model.applyTheme).toHaveBeenCalledWith(endatixSurveyThemeLight);
  });
});

describe("applyHubDashboardTheme", () => {
  it("layers the Hub survey theme on DefaultLight after a clone", () => {
    const dashboard = { applyTheme: vi.fn() };

    applyHubDashboardTheme(dashboard, "light");

    expect(dashboard.applyTheme).toHaveBeenCalledWith(
      {
        ...endatixSurveyThemeLight,
        cssVariables: { ...endatixSurveyThemeLight.cssVariables },
      },
      DefaultLight,
    );
  });

  it("layers the dark Hub survey theme on DefaultDark", () => {
    const dashboard = { applyTheme: vi.fn() };

    applyHubDashboardTheme(dashboard, "dark");

    expect(dashboard.applyTheme).toHaveBeenCalledWith(
      {
        ...endatixSurveyThemeDark,
        cssVariables: { ...endatixSurveyThemeDark.cssVariables },
      },
      DefaultDark,
    );
  });
});

describe("relocateSurveyBaseThemeStyles", () => {
  it("moves the SurveyJS base-theme <style> to document.head once", () => {
    const from = document.createElement("div");
    const style = document.createElement("style");
    style.setAttribute("data-survey-base-theme-variables", "");
    style.textContent = ":where(.sd-theme-root) { --x: 1; }";
    from.appendChild(style);
    document.body.appendChild(from);

    relocateSurveyBaseThemeStyles(from);

    const inHead = document.getElementById("endatix-sjs-base-theme-variables");
    expect(inHead).toBe(style);
    expect(inHead?.parentNode).toBe(document.head);
    expect(from.querySelector("style")).toBeNull();

    const second = document.createElement("style");
    second.setAttribute("data-survey-base-theme-variables", "");
    second.textContent = ":where(.sd-theme-root) { --x: 2; }";
    from.appendChild(second);
    relocateSurveyBaseThemeStyles(from);

    expect(inHead?.textContent).toContain("--x: 2");
    expect(from.querySelector("style")).toBeNull();
    expect(
      document.querySelectorAll("#endatix-sjs-base-theme-variables"),
    ).toHaveLength(1);

    inHead?.remove();
    from.remove();
  });
});
