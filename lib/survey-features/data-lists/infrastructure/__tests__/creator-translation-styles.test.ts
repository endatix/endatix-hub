import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  path.join(
    process.cwd(),
    "lib/survey-features/data-lists/infrastructure/creator-translation-bindings.css",
  ),
  "utf8",
);

/**
 * The data-list rows are injected into the Creator's Translations grid, so they have
 * to read the same palette as the rows around them. SurveyJS v3 dropped the v2
 * variables these rules used to name, which left the declarations falling through to
 * their hard-coded light fallbacks — a white band across the dark grid.
 */
describe("creator translation bindings stylesheet", () => {
  it("names only v3 design tokens", () => {
    // `--ctr-*` and single-prefix `--sjs-*` no longer exist in survey-creator-core 3.x.
    const deadTokens = [...CSS.matchAll(/var\(\s*(--(?:ctr|sjs)-[\w-]+)/g)].map(
      (match) => match[1],
    );

    expect(deadTokens).toEqual([]);
  });

  it("never hard-codes a colour fallback", () => {
    // A literal fallback silently wins whenever a token is missing, which is exactly
    // how the regression hid: `var(--gone, #fff)` renders white in every palette.
    const rules = CSS.split("}");
    const offenders = rules
      .filter((rule) => /background|color|border/.test(rule))
      .flatMap((rule) => [
        ...rule.matchAll(
          /var\([^)]*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\s*\)/gi,
        ),
      ])
      .map((match) => match[0])
      // Spacing/typography fallbacks are fine; only colour ones mask a palette.
      .filter(
        (declaration) => !/--sjs2-spacing|--sjs2-typography/.test(declaration),
      );

    expect(offenders).toEqual([]);
  });

  it("puts the help row on the same surface as the table rows", () => {
    // `.st-table__cell` uses --sjs2-color-bg-basic-primary; the injected row must match.
    expect(CSS).toMatch(
      /\.edx-data-list-translation-help\s*\{[^}]*background-color:\s*var\(--sjs2-color-bg-basic-primary\)/,
    );
  });

  it("colours the data list link with the brand token, not SurveyJS teal", () => {
    expect(CSS).toMatch(
      /\.edx-data-list-translation-header__link\s*\{[^}]*color:\s*var\(--sjs2-color-fg-brand-primary\)/,
    );
    expect(CSS).not.toContain("19b394");
  });
});
