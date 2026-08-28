import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  endatixSurveyThemeDark,
  endatixSurveyThemeLight,
  endatixThemeDark,
  endatixThemeLight,
  hubToken,
  hubTokenFallbacks,
  pickCreatorTheme,
  pickSurveyTheme,
} from "../endatix-themes";

/** Parses the `:root` custom properties out of app/globals.css. */
function readGlobalsRootTokens(): Record<string, string> {
  const css = readFileSync(
    path.join(process.cwd(), "app", "globals.css"),
    "utf8",
  );
  const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
  expect(
    rootBlock,
    "app/globals.css must declare a :root block",
  ).not.toBeNull();

  const tokens: Record<string, string> = {};
  for (const line of rootBlock![1].split("\n")) {
    const match = /^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/.exec(line);
    if (match) {
      tokens[match[1]] = match[2].trim();
    }
  }

  // `--info: var(--primary)` and friends: follow one level of indirection.
  for (const [name, value] of Object.entries(tokens)) {
    const alias = /^var\((--[\w-]+)\)$/.exec(value);
    if (alias && tokens[alias[1]]) {
      tokens[name] = tokens[alias[1]];
    }
  }
  return tokens;
}

describe("hub token fallbacks", () => {
  it("matches the live :root values in app/globals.css", () => {
    // Public form pages do not load globals.css, so these literals are what
    // respondents actually see. If the Hub palette moves, move them together.
    const globals = readGlobalsRootTokens();

    for (const [token, fallback] of Object.entries(hubTokenFallbacks)) {
      expect(globals[token], `${token} missing from :root`).toBeDefined();
      expect(globals[token], `${token} drifted from globals.css`).toBe(
        fallback,
      );
    }
  });

  it("emits var() with a literal fallback", () => {
    expect(hubToken("--primary")).toBe("var(--primary, hsl(216 100% 41%))");
  });
});

/** Panels that must read as raised chrome, with the region each token paints. */
const CHROME_TOKENS = [
  "--sjs2-color-utility-tabs", // .svc-top-bar
  "--sjs2-color-utility-toolbox", // .svc-toolbox__panel
  "--sjs2-color-utility-property-grid", // .svc-side-bar__container
  "--sjs2-color-utility-body", // .svc-creator root
  "--sjs2-color-utility-sheet",
];

/** Editing surfaces that take the Hub page canvas tint. */
const CANVAS_TOKENS = [
  "--sjs2-color-utility-surface-designer", // .svc-tab-designer
  "--sjs2-color-utility-surface-survey", // .sd-root-modern::before
  "--sjs2-color-utility-surface-json-editor",
  "--sjs2-color-utility-surface-presets-manager",
  "--sjs2-color-utility-surface-translations", // .svc-translation-tab
];

describe.each([
  ["light", endatixThemeLight, "light", true],
  ["dark", endatixThemeDark, "dark", false],
] as const)("creator chrome theme (%s)", (_name, theme, palette, isLight) => {
  it("carries the palette metadata", () => {
    expect(theme.themeName).toBe("default");
    expect(theme.colorPalette).toBe(palette);
    expect(theme.isLight).toBe(isLight);
  });

  it("keeps the chrome panels on the card surface", () => {
    for (const token of CHROME_TOKENS) {
      expect(theme.cssVariables[token]).toBe(hubToken("--card"));
    }
  });

  it("tints only the editing surfaces with the page canvas", () => {
    for (const token of CANVAS_TOKENS) {
      expect(theme.cssVariables[token]).toBe("var(--content-canvas)");
    }
  });

  it("never paints the chrome and the canvas the same colour", () => {
    // The v3 regression: every surface token was --content-canvas, so the top bar,
    // toolbox, design canvas and property grid flattened into one block of colour.
    const canvas = new Set(CANVAS_TOKENS.map((t) => theme.cssVariables[t]));
    for (const token of CHROME_TOKENS) {
      expect(canvas.has(theme.cssVariables[token])).toBe(false);
    }
  });

  it("maps the three surface depths onto distinct Hub tokens", () => {
    // recessed (inputs) < canvas (working area) < raised (panels, question cards).
    // Left to the base theme these sit on SurveyJS's neutral grey ramp, which reads
    // as warm grey (#1c1b20 / #222126) against the Hub navy in dark mode.
    const raised = theme.cssVariables["--sjs2-color-bg-basic-primary"];
    const recessed = theme.cssVariables["--sjs2-color-bg-basic-secondary"];
    const canvas = theme.cssVariables["--sjs2-color-utility-surface-designer"];

    expect(raised).toBe(hubToken("--card"));
    expect(recessed).toBe(hubToken("--background"));
    expect(new Set([raised, recessed, canvas]).size).toBe(3);
  });

  it("raises question cards onto the same surface as the chrome", () => {
    // Cards float on the canvas, so they read as raised panels — the same
    // relationship the chrome has, which is why both resolve to --card.
    expect(theme.cssVariables["--sjs2-color-bg-basic-primary"]).toBe(
      theme.cssVariables["--sjs2-color-utility-toolbox"],
    );
  });
});

describe.each([
  ["light", endatixSurveyThemeLight, "endatix-survey-light", "light"],
  ["dark", endatixSurveyThemeDark, "endatix-survey-dark", "dark"],
] as const)("survey theme (%s)", (_name, theme, themeName, palette) => {
  it("layers the Hub source tokens on the matching base theme", () => {
    expect(theme.themeName).toBe(themeName);
    expect(theme.colorPalette).toBe(palette);
    expect(theme.cssVariables["--sjs2-color-project-brand-600"]).toBe(
      hubToken("--primary"),
    );
    expect(theme.cssVariables["--sjs2-color-fg-brand-on-primary"]).toBe(
      hubToken("--primary-foreground"),
    );
    expect(theme.cssVariables["--sjs2-color-utility-surface-survey"]).toBe(
      hubToken("--background"),
    );
    expect(theme.cssVariables["--sjs2-color-fg-basic-secondary"]).toBe(
      hubToken("--muted-foreground"),
    );
    expect(theme.cssVariables["--sjs2-color-fg-brand-primary"]).toBe(
      hubToken("--primary"),
    );
    expect(theme.cssVariables["--sjs2-color-data-grid-fg-label"]).toBe(
      hubToken("--foreground"),
    );
    expect(
      theme.cssVariables["--sjs2-color-component-input-default-value"],
    ).toBe(hubToken("--foreground"));
    expect(
      theme.cssVariables[
        "--sjs2-color-component-action-neutral-tertiary-disabled-label"
      ],
    ).toBe(hubToken("--muted-foreground"));
    expect(theme.cssVariables["--sjs2-opacity-disabled"]).toBe("1");
  });

  it("resolves every Hub reference without globals.css", () => {
    for (const value of Object.values(theme.cssVariables)) {
      if (value.startsWith("var(--") && !value.startsWith("var(--sjs2-")) {
        expect(value, `${value} needs a literal fallback`).toMatch(
          /^var\(--[\w-]+, .+\)$/,
        );
      }
    }
  });
});

describe("picking a theme from next-themes", () => {
  it.each([
    ["dark", endatixThemeDark, endatixSurveyThemeDark],
    ["light", endatixThemeLight, endatixSurveyThemeLight],
    [undefined, endatixThemeLight, endatixSurveyThemeLight],
  ] as const)("maps %s", (resolved, creator, survey) => {
    expect(pickCreatorTheme(resolved)).toBe(creator);
    expect(pickSurveyTheme(resolved)).toBe(survey);
  });
});
