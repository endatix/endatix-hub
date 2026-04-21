import { describe, expect, it } from "vitest";
import { resolveCreatorThemeCssVariables } from "../resolve-creator-theme-css-variables";

describe("resolveCreatorThemeCssVariables", () => {
  it("returns original theme when cssVariables are missing", () => {
    const theme = { themeName: "test" };
    const result = resolveCreatorThemeCssVariables(theme);

    expect(result).toBe(theme);
  });

  it("resolves accepted color values and keeps non-color values unchanged", () => {
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
    expect(result.cssVariables["--non-color"]).toBe("16px");

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
