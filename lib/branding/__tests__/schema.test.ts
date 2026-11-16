import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BrandPackSchema,
  brandPackJsonSchema,
  formatBrandPackIssues,
} from "../schema";

const brandingDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fixturesDir = path.join(brandingDir, "fixtures");

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function fixture(name: string): unknown {
  return readJson(path.join(fixturesDir, `${name}.json`));
}

function failingPaths(name: string): string[] {
  const result = BrandPackSchema.safeParse(fixture(name));
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("brand pack schema", () => {
  it("generates the committed brand.schema.json", () => {
    // Arrange
    const committed = readJson(path.join(brandingDir, "brand.schema.json"));

    // Act
    const generated = brandPackJsonSchema();

    // Assert
    expect(generated).toEqual(committed);
  });

  it("is committed as pnpm brand:schema writes it", () => {
    // Arrange
    const committed = readFileSync(
      path.join(brandingDir, "brand.schema.json"),
      "utf8",
    );

    // Act
    const generated = `${JSON.stringify(brandPackJsonSchema(), null, 2)}\n`;

    // Assert
    expect(committed).toBe(generated);
  });

  it.each(
    readdirSync(fixturesDir)
      .filter((file) => file.startsWith("valid-"))
      .map((file) => file.replace(/\.json$/, "")),
  )("accepts the shared fixture %s", (name) => {
    // Act
    const result = BrandPackSchema.safeParse(fixture(name));

    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ["invalid-path-traversal", "assets.icon"],
    ["invalid-unknown-key", ""],
    ["invalid-version", "version"],
  ])("rejects the shared fixture %s at %s", (name, fieldPath) => {
    // Act
    const paths = failingPaths(name);

    // Assert
    expect(paths).toContain(fieldPath);
  });

  it("names the unknown key in the report", () => {
    // Arrange
    const result = BrandPackSchema.safeParse(fixture("invalid-unknown-key"));

    // Act
    const report = result.success ? "" : formatBrandPackIssues(result.error);

    // Assert
    expect(report).toContain("fonts");
  });

  it.each([
    [
      "tokens.color.primary.$value",
      { primary: { $type: "color", $value: "blue-ish" } },
    ],
    [
      "tokens.color.primary-on-dark.$value",
      {
        primary: { $type: "color", $value: "#0b6b5d" },
        "primary-on-dark": { $type: "color", $value: "rgb(1 2)" },
      },
    ],
  ])("rejects a colour it cannot read at %s", (fieldPath, color) => {
    // Arrange
    const pack = { version: 1, name: "Example Forms", tokens: { color } };

    // Act
    const result = BrandPackSchema.safeParse(pack);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      fieldPath,
    );
  });

  it.each([
    ["links.website", { links: { website: "javascript:alert(1)" } }],
    ["email.fromAddress", { email: { fromAddress: "not-an-address" } }],
  ])("rejects a malformed value at %s", (fieldPath, extra) => {
    // Arrange
    const pack = { version: 1, name: "Example Forms", ...extra };

    // Act
    const result = BrandPackSchema.safeParse(pack);

    // Assert
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      fieldPath,
    );
  });
});
