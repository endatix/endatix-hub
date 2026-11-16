import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const hubRoot = process.cwd();
const fixtures = path.join(hubRoot, "lib/branding/fixtures");
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "brand-validate-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function validate(target = dir) {
  return spawnSync(
    process.execPath,
    ["scripts/brand-pack.mjs", "validate", target],
    {
      cwd: hubRoot,
      encoding: "utf8",
    },
  );
}

describe("brand-pack validate", () => {
  it("reports a bad pack with the field path and exits 1", () => {
    // Arrange
    copyFileSync(
      path.join(fixtures, "invalid-path-traversal.json"),
      path.join(dir, "brand.json"),
    );

    // Act
    const run = validate();

    // Assert
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("assets.icon");
  });

  it("accepts a good pack and warns about a faint accent", () => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        tokens: { color: { primary: { $type: "color", $value: "#ffd400" } } },
      }),
    );

    // Act
    const run = validate();

    // Assert
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Brand pack OK: Example Forms");
    expect(run.stderr).toContain("warning: tokens.color.primary");
  });

  it("exits 2 without a folder", () => {
    // Act
    const run = spawnSync(
      process.execPath,
      ["scripts/brand-pack.mjs", "validate"],
      {
        cwd: hubRoot,
        encoding: "utf8",
      },
    );

    // Assert
    expect(run.status).toBe(2);
  });
});
