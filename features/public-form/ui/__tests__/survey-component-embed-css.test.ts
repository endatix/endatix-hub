import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

  it("pins the fill-mode background layer to the iframe viewport", () => {
    // Arrange - the theme's background image layer is sized to the survey root, so a
    // completed page shorter than the iframe left the space below it on the flat
    // fallback colour. Fixed also keeps it out of flow, so it cannot feed back into
    // the reported height.
    const fillBlocks = blocksFor(".sd-root_background-image").join("\n");

    // Assert
    expect(fillBlocks).toContain("position: fixed");
  });

  it("still lets the standalone layout fill the real viewport", () => {
    // Arrange
    const standaloneBlocks = blocksFor(".layoutFullHeight").join("\n");

    // Assert - the vh sizing belongs here, where the viewport is the window.
    expect(standaloneBlocks).toContain("100vh");
  });
});
