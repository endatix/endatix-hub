import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Inside an embed the viewport is the iframe, whose height the host sets from what
 * EmbedHeightReporter measures. A viewport-derived length therefore feeds the
 * measurement back into itself: the completed page used `100vh - 10rem` and walked
 * the iframe down 10rem per postMessage round trip instead of landing on the content
 * height (h947). Keep embed-scoped rules viewport-independent.
 */
describe("survey-component.module.css embed rules", () => {
  const css = readFileSync(
    join(__dirname, "..", "survey-component.module.css"),
    "utf8",
  );

  function blocksFor(selectorFragment: string): string[] {
    const blocks: string[] = [];
    const re = /([^{}]+)\{([^}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(css)) !== null) {
      if (match[1].includes(selectorFragment)) {
        blocks.push(match[2]);
      }
    }
    return blocks;
  }

  it("scopes embed rules without viewport units", () => {
    // Arrange
    const embedBlocks = blocksFor(".embedShell");

    // Assert
    expect(embedBlocks.length).toBeGreaterThan(0);
    for (const block of embedBlocks) {
      expect(block).not.toMatch(/\d\s*(vh|vw|dvh|dvw|svh|lvh)\b/);
    }
  });

  it("still lets the standalone layout fill the real viewport", () => {
    // Arrange
    const standaloneBlocks = blocksFor(".layoutFullHeight").join("\n");

    // Assert - the vh sizing belongs here, where the viewport is the window.
    expect(standaloneBlocks).toContain("100vh");
  });
});
