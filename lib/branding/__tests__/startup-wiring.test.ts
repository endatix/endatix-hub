import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * An invalid pack must stop the Hub at start. The loader tests call the check
 * themselves, so dropping it from instrumentation would leave them green.
 */
describe("brand pack startup wiring", () => {
  it("checks the mounted pack from the server instrumentation entry point", () => {
    // Act
    const source = readFileSync(
      path.join(process.cwd(), "instrumentation.ts"),
      "utf8",
    );

    // Assert
    expect(source).toContain("@/lib/branding/deployment-pack.server");
    expect(source).toContain("assertBrandPackAtStartup()");
  });
});
