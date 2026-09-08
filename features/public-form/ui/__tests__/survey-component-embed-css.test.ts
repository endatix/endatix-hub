import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(__dirname, "..", "survey-component.module.css"),
  "utf8",
);

const RULE = /([^{}]+)\{([^}]*)\}/g;
const VIEWPORT_UNIT = /\d\s*(?:(?:s|l|d)?v(?:h|w|min|max|i|b))\b/;

describe("survey-component.module.css", () => {
  it("matches the CSS viewport-percentage family", () => {
    expect("1vh").toMatch(VIEWPORT_UNIT);
    expect("1 vmin").toMatch(VIEWPORT_UNIT);
    expect("1svmax").toMatch(VIEWPORT_UNIT);
    expect("1dvi").toMatch(VIEWPORT_UNIT);
    expect("1rem").not.toMatch(VIEWPORT_UNIT);
  });

  it("sizes embed rules without viewport units (h947 feedback loop)", () => {
    const embedRules = [...css.matchAll(RULE)].filter(([, selector]) =>
      selector.includes(".embedShell"),
    );

    // Assert
    expect(embedRules.length).toBeGreaterThan(0);
    for (const [, , body] of embedRules) {
      expect(body).not.toMatch(VIEWPORT_UNIT);
    }
  });
});
