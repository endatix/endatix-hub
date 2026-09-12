import { describe, expect, it, vi } from "vitest";
import { applyEndatixCreatorTheme } from "../creator-theme";
import type { HubTheme } from "../endatix-themes";

function makeCreator(plugin?: { model?: unknown }) {
  return {
    preferredColorPalette: "",
    applyCreatorTheme: vi.fn(),
    getPlugin: vi.fn(() => plugin),
  };
}

function applied(creator: ReturnType<typeof makeCreator>): HubTheme {
  return creator.applyCreatorTheme.mock.calls[0][0];
}

function theme(cssVariables: Record<string, string>, colorPalette = "light") {
  return { themeName: "test", colorPalette, cssVariables } as HubTheme;
}

/**
 * Emulates Chrome dropping a `color` that is invalid at computed-value time and
 * reporting the inherited one. jsdom never resolves a `var()`, so the resolve
 * pass cannot otherwise be exercised the way a browser exercises it.
 */
function spyOnInheritedComputedColor() {
  const original = globalThis.getComputedStyle;
  return vi
    .spyOn(globalThis, "getComputedStyle")
    .mockImplementation((element: Element) => {
      const target = element as HTMLElement;
      if (!target.style.color.includes("var(")) {
        return original(element);
      }
      for (let node = target.parentElement; node; node = node.parentElement) {
        if (node.style.color) {
          return { color: node.style.color } as CSSStyleDeclaration;
        }
      }
      return { color: "rgb(2, 8, 23)" } as CSSStyleDeclaration; // Hub --foreground
    });
}

describe("applyEndatixCreatorTheme", () => {
  it("sets the palette from the theme and applies it once", () => {
    const creator = makeCreator();

    applyEndatixCreatorTheme(creator as never, theme({}, "dark"));

    expect(creator.preferredColorPalette).toBe("dark");
    // applyCreatorTheme already calls syncTheme internally.
    expect(creator.applyCreatorTheme).toHaveBeenCalledTimes(1);
  });

  it("resolves Hub colours so Creator's JS colour maths can read them", () => {
    // Creator tints selected rows via parseColor(), which cannot read a var().
    const root = document.createElement("div");
    document.body.appendChild(root);
    const creator = makeCreator();

    applyEndatixCreatorTheme(
      creator as never,
      theme({ "--resolved": "#ff0000", "--non-color": "16px" }),
      root,
    );

    expect(applied(creator).cssVariables["--resolved"]).toBe("rgb(255, 0, 0)");
    expect(applied(creator).cssVariables["--non-color"]).toBe("16px");
    root.remove();
  });

  it("never rewrites SurveyJS relative tokens", () => {
    // The browser reports an unknown var as the inherited `color`, which would
    // repaint the dark chrome with the Hub foreground.
    const root = document.createElement("div");
    document.body.appendChild(root);
    const creator = makeCreator();
    const relative = {
      "--sjs2-color-bg-basic-primary": "var(--sjs2-palette-gray-900)",
      "--sjs2-color-fg-basic-primary":
        "rgba(from var(--sjs2-palette-gray-000) r g b / 0.85)",
    };

    applyEndatixCreatorTheme(creator as never, theme({ ...relative }), root);

    expect(applied(creator).cssVariables).toMatchObject(relative);
    root.remove();
  });

  it("keeps a var() the browser cannot resolve", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const creator = makeCreator();

    applyEndatixCreatorTheme(
      creator as never,
      theme({ "--missing": "var(--does-not-exist)" }),
      root,
    );

    expect(applied(creator).cssVariables["--missing"]).toBe(
      "var(--does-not-exist)",
    );
    root.remove();
  });

  it("keeps a length token the browser reports as the inherited colour", () => {
    // Arrange
    // Resolving the inherited colour into --sjs2-base-unit-radius made every
    // calc() radius invalid: border-radius: 0 Creator-wide (endatix-hub#954).
    const root = document.createElement("div");
    document.body.appendChild(root);
    const creator = makeCreator();
    const spy = spyOnInheritedComputedColor();

    try {
      // Act
      applyEndatixCreatorTheme(
        creator as never,
        theme({
          "--sjs2-base-unit-radius": "var(--radius, 0.5rem)",
          "--sjs2-spacing-x100": "0.5rem",
        }),
        root,
      );

      // Assert
      expect(applied(creator).cssVariables).toMatchObject({
        "--sjs2-base-unit-radius": "var(--radius, 0.5rem)",
        "--sjs2-spacing-x100": "0.5rem",
      });
    } finally {
      // A failed assertion must not leak the mock into later tests.
      spy.mockRestore();
      root.remove();
    }
  });

  it("resolves a var() the browser computes to a concrete colour", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    const creator = makeCreator();
    const original = globalThis.getComputedStyle;
    const spy = vi
      .spyOn(globalThis, "getComputedStyle")
      .mockImplementation((element: Element) =>
        (element as HTMLElement).style.color.includes("var(")
          ? ({ color: "rgb(12, 34, 56)" } as CSSStyleDeclaration)
          : original(element),
      );

    applyEndatixCreatorTheme(
      creator as never,
      theme({ "--resolved-var": "var(--primary)" }),
      root,
    );

    expect(applied(creator).cssVariables["--resolved-var"]).toBe(
      "rgb(12, 34, 56)",
    );
    spy.mockRestore();
    root.remove();
  });

  it("passes the theme through untouched when there are no cssVariables", () => {
    const creator = makeCreator();
    const input = { themeName: "test", colorPalette: "light" } as HubTheme;

    applyEndatixCreatorTheme(creator as never, input);

    expect(applied(creator)).toBe(input);
  });

  it("paints Translations grid roots instead of calling applyTheme", () => {
    const stringsRoot = document.createElement("div");
    const headerRoot = document.createElement("div");
    const stringsSurvey = { rootElement: stringsRoot, applyTheme: vi.fn() };
    const stringsHeaderSurvey = {
      rootElement: headerRoot,
      applyTheme: vi.fn(),
    };
    const creator = makeCreator({
      model: { stringsSurvey, stringsHeaderSurvey },
    });

    applyEndatixCreatorTheme(
      creator as never,
      theme({ "--sjs2-color-bg-basic-primary": "#001a34" }, "dark"),
    );

    expect(creator.getPlugin).toHaveBeenCalledWith("translation");
    expect(stringsSurvey.applyTheme).not.toHaveBeenCalled();
    expect(stringsHeaderSurvey.applyTheme).not.toHaveBeenCalled();
    expect(
      stringsRoot.style.getPropertyValue("--sjs2-color-bg-basic-primary"),
    ).toBe("rgb(0, 26, 52)");
    expect(
      headerRoot.style.getPropertyValue("--sjs2-color-bg-basic-primary"),
    ).toBe("rgb(0, 26, 52)");
  });
});
