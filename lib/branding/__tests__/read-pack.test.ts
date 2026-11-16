import {
  copyFileSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BrandPackError, readBrandPack } from "../read-pack";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "brand-pack-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function useFixture(name: string) {
  copyFileSync(
    path.join(fixturesDir, `${name}.json`),
    path.join(dir, "brand.json"),
  );
}

function touch(...files: string[]) {
  for (const file of files) writeFileSync(path.join(dir, file), "<svg/>");
}

function errorOf(run: () => unknown): BrandPackError {
  try {
    run();
  } catch (error) {
    if (error instanceof BrandPackError) return error;
    throw error;
  }
  throw new Error("expected a BrandPackError");
}

describe("readBrandPack", () => {
  it("reads a valid pack and fingerprints it", () => {
    // Arrange
    useFixture("valid-full");
    touch("logo-light.svg", "logo-dark.svg", "icon.svg", "og.jpg");

    // Act
    const loaded = readBrandPack(dir);

    // Assert
    expect(loaded.pack.name).toBe("Example Forms");
    expect(loaded.fingerprint).toMatch(/^[0-9a-f]{12}$/);
  });

  it("names the field path of a schema failure", () => {
    // Arrange
    useFixture("invalid-path-traversal");

    // Act
    const error = errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.icon: Use a file inside the pack folder",
    );
  });

  it("names the field whose file is missing", () => {
    // Arrange
    useFixture("valid-full");
    touch("logo-light.svg", "icon.svg", "og.jpg");

    // Act
    const error = errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.logo.dark: logo-dark.svg not found",
    );
  });

  it("refuses a file that links outside the pack", () => {
    // Arrange
    writeFileSync(
      path.join(dir, "brand.json"),
      JSON.stringify({
        version: 1,
        name: "Example Forms",
        assets: { icon: "icon.svg" },
      }),
    );
    const outside = mkdtempSync(path.join(tmpdir(), "outside-"));
    writeFileSync(path.join(outside, "secret.svg"), "x");
    symlinkSync(path.join(outside, "secret.svg"), path.join(dir, "icon.svg"));

    // Act
    const error = errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain(
      "assets.icon: icon.svg is outside the pack folder",
    );
    rmSync(outside, { recursive: true, force: true });
  });

  it("reports a missing brand.json", () => {
    // Act
    const error = errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toContain("brand.json");
  });

  it("reports JSON that does not parse", () => {
    // Arrange
    writeFileSync(path.join(dir, "brand.json"), "{ version: 1");

    // Act
    const error = errorOf(() => readBrandPack(dir));

    // Assert
    expect(error.message).toMatch(/not valid JSON/);
  });
});
