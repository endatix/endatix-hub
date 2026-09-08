import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(__dirname, "..", "survey-component.module.css"),
  "utf8",
);

const RULE = /([^{}]+)\{([^}]*)\}/g;
const VIEWPORT_UNIT = /\d\s*(vh|vw|dvh|dvw|svh|lvh)\b/;

describe("survey-component.module.css", () => {
  it("sizes embed rules without viewport units (h947 feedback loop)", () => {
    // Arrange - in the iframe, vh resolves against the height we ourselves report,
    // so a vh-sized complete page walks the iframe smaller on every resize message.
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
