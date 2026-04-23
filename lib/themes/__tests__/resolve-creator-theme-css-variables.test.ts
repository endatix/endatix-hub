import { describe, expect, it, vi } from "vitest";
import { resolveCreatorThemeCssVariables } from "../resolve-creator-theme-css-variables";

describe("resolveCreatorThemeCssVariables", () => {
  it("returns original theme when cssVariables are missing", () => {
    const theme = { themeName: "test" };
    const result = resolveCreatorThemeCssVariables(theme);

    expect(result).toBe(theme);
  });

  it("resolves accepted color values and omits rejected values", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const theme = {
      themeName: "test",
      cssVariables: {
        "--resolved": "#ff0000",
        "--non-color": "16px",
      },
    };

    const result = resolveCreatorThemeCssVariables(theme, root);

    expect(result).not.toBe(theme);
    expect(result.cssVariables["--resolved"]).toBe("rgb(255, 0, 0)");
    expect(result.cssVariables["--non-color"]).toBeUndefined();

    root.remove();
  });

  it("omits unresolved var() tokens to allow SurveyJS fallback", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const theme = {
      themeName: "test",
      cssVariables: {
        "--missing-token-color": "var(--does-not-exist)",
      },
    };

    const result = resolveCreatorThemeCssVariables(theme, root);
    expect(result.cssVariables["--missing-token-color"]).toBeUndefined();

    root.remove();
  });

  it("keeps valid var() tokens when browser computes a concrete color", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    const originalGetComputedStyle = globalThis.getComputedStyle;
    const getComputedStyleMock = vi
      .spyOn(globalThis, "getComputedStyle")
      .mockImplementation((element: Element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.style.color.includes("var(")) {
          return { color: "rgb(12, 34, 56)" } as CSSStyleDeclaration;
        }

        return originalGetComputedStyle(element);
      });

    const theme = {
      themeName: "test",
      cssVariables: {
        "--resolved-var": "var(--primary)",
      },
    };

    const result = resolveCreatorThemeCssVariables(theme, root);
    expect(result.cssVariables["--resolved-var"]).toBe("rgb(12, 34, 56)");

    getComputedStyleMock.mockRestore();
    root.remove();
  });

  it("returns original theme when document is unavailable", () => {
    const theme = { cssVariables: { "--primary": "#ff0000" } };
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, "document", {
      value: undefined,
      configurable: true,
    });

    const result = resolveCreatorThemeCssVariables(theme);
    expect(result).toBe(theme);

    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
    });
  });
});
