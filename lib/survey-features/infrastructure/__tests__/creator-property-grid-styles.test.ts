import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const STYLESHEET =
  "lib/survey-features/infrastructure/creator-property-grid.css";

const CSS = readFileSync(path.join(process.cwd(), STYLESHEET), "utf8");

/** Comments stripped: they name the very tokens these rules override. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The Creator entry points, and the only files allowed to load this stylesheet. */
const CREATOR_CONTAINERS = [
  "features/forms/ui/editor/form-editor-container.tsx",
  "features/form-templates/ui/form-template-editor-container.tsx",
];

/** Reaches the Creator but must never reach a respondent or submission page. */
const RESPONDENT_ENTRY_POINTS = [
  "features/public-form/ui/use-survey-model.hook.ts",
  "features/submissions/ui/shared/submission-survey.tsx",
  "features/form-templates/ui/form-template-preview.tsx",
];

function read(file: string): string {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

/** Every rule in the file, as `{ selector, body }`. */
const BLOCKS = RULES.split("}")
  .map((block) => block.split("{"))
  .filter(([selector, body]) => selector?.trim() && body?.trim())
  .map(([selector, body]) => ({
    selector: selector.trim().replace(/\s+/g, " "),
    body: body.trim(),
  }));

describe("creator property grid stylesheet", () => {
  it("recesses matrix cells onto the input fill", () => {
    // The vendor fills a cell with the *raised* surface, i.e. the panel's own
    // colour, so Value and Group read as plain text until focused (#954).
    expect(RULES).toMatch(
      /\.svc-creator \.spg-table__cell:not\(\.spg-table__cell--detail-panel\) \.sd-formbox\s*\{[^}]*background-color:\s*var\(--sjs2-color-component-formbox-default-bg\)/,
    );
    expect(RULES).not.toContain("--sjs2-color-bg-basic-primary");
  });

  it("names only v3 design tokens", () => {
    // `--ctr-*` and single-prefix `--sjs-*` are gone in 3.x: a rule naming them
    // falls through to its literal fallback in every palette.
    const deadTokens = [
      ...RULES.matchAll(/var\(\s*(--(?:ctr|sjs)-[\w-]+)/g),
    ].map((match) => match[1]);

    expect(deadTokens).toEqual([]);
  });

  it("never hard-codes a colour fallback", () => {
    const offenders = RULES.split("}")
      .filter((rule) => /background|color|border/.test(rule))
      .flatMap((rule) => [
        ...rule.matchAll(
          /var\([^)]*,\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\s*\)/gi,
        ),
      ])
      .map((match) => match[0])
      .filter(
        (declaration) => !/--sjs2-spacing|--sjs2-typography/.test(declaration),
      );

    expect(offenders).toEqual([]);
  });

  it("keeps the specificity bump that beats the vendor rule", () => {
    // Without the prefix these tie the vendor's specificity, and its sheet loads
    // after this file — the override then silently does nothing.
    expect(BLOCKS).not.toEqual([]);
    for (const { selector } of BLOCKS) {
      expect(selector, `${selector} must outrank the vendor rule`).toMatch(
        /^\.svc-creator\s/,
      );
    }
  });

  it("outlines matrix cells with the formbox border effect", () => {
    // The vendor sets `box-shadow: none` here, so the outline must be restated.
    const cell = BLOCKS.find(({ selector }) =>
      selector.endsWith(".sd-formbox"),
    );

    expect(cell?.body).toContain(
      "box-shadow: var(--sjs2-border-effect-component-formbox-default)",
    );
  });

  it("owns the focused state instead of leaving it to load order", () => {
    // The vendor's ring is an equal-specificity `:focus-within` rule, so leaving
    // it unstated would put the ring at the mercy of load order.
    const focused = BLOCKS.find(({ selector }) =>
      selector.endsWith(".sd-formbox:focus-within"),
    );

    expect(focused?.body).toMatch(/box-shadow:/);
  });

  it("keeps Value and Text one width and Group narrower", () => {
    const widthOf = (match: string) =>
      Number(
        BLOCKS.find(({ selector }) => selector.includes(match))?.body.match(
          /width:\s*(\d+)%/,
        )?.[1],
      );

    // One shared rule for columns 2 and 3 is what keeps them equal.
    const shared = widthOf(":is(:nth-child(2), :nth-child(3))");
    const group = widthOf(":nth-child(4):not(.spg-table__cell--actions)");

    expect(shared).toBeGreaterThan(0);
    expect(group).toBeGreaterThan(0);
    expect(group).toBeLessThan(shared);
  });

  it("shrinks the icon columns so the slack lands on the data columns", () => {
    // A percentage under their content width shrinks them to min-content; without
    // it a Group-less matrix gave the leftover to the drag handle (~114px).
    const actions = BLOCKS.find(({ selector }) =>
      selector.endsWith(".spg-table__cell--actions"),
    );

    expect(actions?.body).toMatch(/width:\s*1%/);
  });

  it("separates adjacent rows in dropdown popups", () => {
    // `ul.sd-selectlist` is a plain block list with no item margins, so adjacent
    // selections fuse into one slab (#954). Only the spacing was missing.
    const rule = BLOCKS.find(({ selector }) =>
      selector.includes(".sd-selectlist__item + .sd-selectlist__item"),
    );

    expect(rule?.body).toMatch(
      /margin-block-start:\s*var\(--sjs2-spacing-x0[1-9]/,
    );
  });

  it("targets the selectlist classes, not the other two list sets", () => {
    // Three list class sets exist: `sv-list__item`, `sd-menu-item` and
    // `sd-selectlist__item`. These popups render the third; the other two match
    // nothing and fail silently. Verify against the DOM, not the docs.
    expect(RULES).not.toContain(".sv-list__item");
    expect(RULES).not.toContain(".sd-menu-item");
  });

  it("scopes every width rule to the ItemValue matrices", () => {
    // Positions only hold for Value/Text(/Group); other matrices keep vendor layout.
    const widthRules = BLOCKS.filter(({ body }) => /width:/.test(body));

    expect(widthRules).not.toEqual([]);
    for (const { selector } of widthRules) {
      expect(selector, `${selector} must be scoped`).toMatch(
        /\[data-name="(choices|rows|columns|rateValues)"\]/,
      );
    }
  });
});

describe("creator property grid stylesheet loading", () => {
  it.each(CREATOR_CONTAINERS)("is loaded by %s", (container) => {
    expect(read(container)).toContain(
      '"@/lib/survey-features/infrastructure/creator-property-grid.css"',
    );
  });

  it.each(RESPONDENT_ENTRY_POINTS)("is not loaded by %s", (entryPoint) => {
    // Plain Survey Models: Creator chrome CSS would be dead weight for
    // respondents. Same rule as DESIGN.md §9 "Public pages stay off globals.css".
    expect(read(entryPoint)).not.toContain("creator-property-grid");
  });
});
