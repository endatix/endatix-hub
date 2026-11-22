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
    // A Windows checkout may turn LF into CRLF; the generator writes LF.
    const committed = readFileSync(
      path.join(brandingDir, "brand.schema.json"),
      "utf8",
    ).replaceAll("\r\n", "\n");

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
    ["invalid-support-mailto", "links.support"],
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
    ["links.support", { links: { support: "ftp://example.com" } }],
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

describe("a mailto support link", () => {
  const support = (link: string) =>
    BrandPackSchema.safeParse({
      version: 1,
      name: "Example Forms",
      links: { support: link },
    });

  // The API reads the support address from this link (endatix/endatix#1711).
  it.each([
    "mailto:help@example.com",
    "mailto:help@example.com?subject=Help",
    "mailto:help@example.com#contact",
    "mailto:first%2Blast@example.com",
    "mailto:help%40example.com",
    "mailto:help%40example.com%zz",
    "mailto:a@example.com,b@example.com",
    "mailto:a@example.com%2Cb@example.com",
    "https://example.com/support",
  ])("accepts %j, as the API does", (link) => {
    // Act
    const result = support(link);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    "mailto:?subject=Help",
    "mailto:not-an-email",
    "mailto:Example <help@example.com>",
    "mailto:%22Example%22 help@example.com",
    "mailto:a%28b%29@example.com",
    "mailto:help%20me@example.com%zz",
    "mailto:a%01b@example.com",
    "mailto:a%C3%28b@example.com",
    "mailto:e%CC%81@example.com",
  ])("rejects %j at links.support, as the API does", (link) => {
    // Act
    const result = support(link);

    // Assert
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "links.support",
    ]);
    expect(formatBrandPackIssues(result.error!)).toContain(
      "links.support: Use a mailto: link to one email address",
    );
  });

  it.each([
    ["a list", "mailto:a%2C%zz", true],
    ["one address", "mailto:a%28b%zz@example.com", false],
  ])(
    "decodes the other escapes of %s around one it cannot decode",
    (_, link, valid) => {
      // Act
      const result = support(link);

      // Assert
      expect(result.success).toBe(valid);
    },
  );
});

describe("email address shape", () => {
  const accepts = (address: string) =>
    BrandPackSchema.safeParse({
      version: 1,
      name: "Example Forms",
      links: { support: `mailto:${address}` },
    }).success;

  // The API's rule: MailAddress parses it, and reads back the same address.
  it.each([
    ["help@example.com", true],
    ["first.last@sub.example.com", true],
    ["a@b.c", true],
    ["a@localhost", true],
    ["a@b..c", false],
    ["a@.b.c", false],
    [".a@b.c", false],
    ["a@b.", false],
    ["@b.c", false],
    ["a@", false],
    ["a b@c.d", false],
    ["a@b c.d", false],
    ["a@b@c.d", false],
    ["a(b)@example.com", false],
    ["(c)a@b.co", false],
    ["<a@b.co>", false],
    ["", false],
  ])("treats %j as %s", (address, valid) => {
    // Act
    const result = accepts(address);

    // Assert
    expect(result).toBe(valid);
  });

  it("rejects a long address with many dots", () => {
    // Arrange: a backtracking pattern retries every dot before failing on the "@".
    const address = `a@${"a.".repeat(20_000)}@`;

    // Act
    const result = accepts(address);

    // Assert
    expect(result).toBe(false);
  });
});

describe("pack file names", () => {
  const icon = (file: string) =>
    BrandPackSchema.safeParse({
      version: 1,
      name: "Example Forms",
      assets: { icon: file },
    }).success;

  it.each([
    ["icon.svg", true],
    ["img/icon.svg", true],
    ["logo.light.svg", true],
    ["./icon.svg", false],
    ["img/./icon.svg", false],
    ["img//icon.svg", false],
    [".hidden.svg", false],
    ["../icon.svg", false],
    ["/icon.svg", false],
    ["https://x/icon.svg", false],
  ])("treats %j as %s, as the Hub's loader does", (file, valid) => {
    // Act
    const result = icon(file);

    // Assert
    expect(result).toBe(valid);
  });
});
