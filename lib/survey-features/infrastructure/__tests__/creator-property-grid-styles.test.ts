import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const STYLESHEET =
  "lib/survey-features/infrastructure/creator-property-grid.css";

const CSS = readFileSync(path.join(process.cwd(), STYLESHEET), "utf8");

/**
 * Comments stripped. The comments name the vendor tokens this file exists to
 * override, so asserting on raw CSS would match the explanation, not the rule.
 */
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
    // survey-creator-core fills a matrix cell with --sjs2-color-bg-basic-primary,
    // the *raised* surface, which is the same colour as the panel behind it — so
    // Value and Group read as plain text until focused (endatix-hub#954).
    expect(RULES).toMatch(
      /\.svc-creator \.spg-table__cell:not\(\.spg-table__cell--detail-panel\) \.sd-formbox\s*\{[^}]*background-color:\s*var\(--sjs2-color-component-formbox-default-bg\)/,
    );
    expect(RULES).not.toContain("--sjs2-color-bg-basic-primary");
  });

  it("names only v3 design tokens", () => {
    // `--ctr-*` and single-prefix `--sjs-*` no longer exist in survey-creator-core 3.x,
    // so a rule naming them falls through to its literal fallback in every palette.
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
    // Without `.svc-creator` this selector matches survey-creator-core's own rule
    // character for character, so specificity ties and load order decides — and the
    // vendor sheet arrives with the dynamically imported editor, after this file.
    // Dropping the prefix makes the override silently do nothing.
    expect(BLOCKS).not.toEqual([]);
    for (const { selector } of BLOCKS) {
      expect(selector, `${selector} must outrank the vendor rule`).toMatch(
        /^\.svc-creator\s/,
      );
    }
  });

  it("outlines matrix cells with the formbox border effect", () => {
    // The fill alone still reads flat beside a bordered input, and the vendor sets
    // `box-shadow: none` on this selector, so it has to be restated.
    const cell = BLOCKS.find(({ selector }) =>
      selector.endsWith(".sd-formbox"),
    );

    expect(cell?.body).toContain(
      "box-shadow: var(--sjs2-border-effect-component-formbox-default)",
    );
  });

  it("owns the focused state instead of leaving it to load order", () => {
    // The vendor's focus ring sits on an equal-specificity `:focus-within` rule, so
    // restoring `box-shadow` at rest without restating the focused value would put
    // the ring back at the mercy of which stylesheet loads last.
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

    // One shared rule for columns 2 and 3 is what guarantees they stay equal.
    const shared = widthOf(":is(:nth-child(2), :nth-child(3))");
    const group = widthOf(":nth-child(4):not(.spg-table__cell--actions)");

    expect(shared).toBeGreaterThan(0);
    expect(group).toBeGreaterThan(0);
    expect(group).toBeLessThan(shared);
  });

  it("shrinks the icon columns so the slack lands on the data columns", () => {
    // A percentage under their content width makes the table shrink them to
    // min-content. Without it a matrix with no Group column handed the leftover
    // to the drag handle, which ballooned to ~114px.
    const actions = BLOCKS.find(({ selector }) =>
      selector.endsWith(".spg-table__cell--actions"),
    );

    expect(actions?.body).toMatch(/width:\s*1%/);
  });

  it("scopes every width rule to the ItemValue matrices", () => {
    // The column positions only hold where the columns are Value/Text(/Group).
    // Validators and the other matrices must keep the vendor's own layout.
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
    // These render a plain Survey Model, so Creator chrome CSS would be dead
    // weight shipped to respondents. DESIGN.md §9 "Public pages stay off
    // globals.css" is the same rule.
    expect(read(entryPoint)).not.toContain("creator-property-grid");
  });
});
