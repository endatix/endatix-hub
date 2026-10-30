import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  describeNestedLinkedExternals,
  findNestedLinkedExternals,
} from "../lib/linked-externals.mjs";

// A standalone folder shaped like the Hub's: Turbopack links each external into
// .next/node_modules as a `<name>-<hash>` symlink.
let root: string;

function writePackage(dir: string) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: path.basename(dir) }));
}

function link(target: string, name: string) {
  const linkPath = path.join(root, ".next/node_modules", name);
  mkdirSync(path.dirname(linkPath), { recursive: true });
  symlinkSync(path.join(root, "node_modules", target), linkPath);
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "linked-externals-"));
  writePackage(path.join(root, "node_modules/sanitize-html"));
  writePackage(path.join(root, "node_modules/sanitize-html/node_modules/postcss"));
  writePackage(path.join(root, "node_modules/@opentelemetry/api"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("findNestedLinkedExternals", () => {
  it("accepts links to top-level packages, scoped ones included", () => {
    // Arrange
    link("sanitize-html", "sanitize-html-6ef27188a4b3dc42");
    link("@opentelemetry/api", "@opentelemetry/api-2a4c6e8f0b1d3f5a");

    // Act
    const nested = findNestedLinkedExternals(root);

    // Assert
    expect(nested).toEqual([]);
  });

  it("reports a link to a package nested in another package's node_modules", () => {
    // Arrange
    link("sanitize-html", "sanitize-html-6ef27188a4b3dc42");
    link("sanitize-html/node_modules/postcss", "postcss-16ee410f62bb922c");

    // Act
    const nested = findNestedLinkedExternals(root);

    // Assert
    expect(nested).toEqual([
      {
        link: path.join(".next/node_modules", "postcss-16ee410f62bb922c"),
        target: path.join("sanitize-html", "node_modules", "postcss"),
        parent: "sanitize-html",
      },
    ]);
  });

  it("names a scoped parent as the package to load by name", () => {
    // Arrange
    writePackage(path.join(root, "node_modules/@acme/widgets/node_modules/postcss"));
    link("@acme/widgets/node_modules/postcss", "postcss-16ee410f62bb922c");

    // Act
    const [nested] = findNestedLinkedExternals(root);

    // Assert
    expect(nested.parent).toBe("@acme/widgets");
  });

  it("reports a link whose target is missing instead of throwing", () => {
    // Arrange
    link("left-out", "left-out-0a1b2c3d4e5f6a7b");

    // Act
    const nested = findNestedLinkedExternals(root);

    // Assert
    expect(nested).toEqual([
      { link: path.join(".next/node_modules", "left-out-0a1b2c3d4e5f6a7b"), target: undefined, parent: undefined },
    ]);
  });

  it("finds nothing when the build linked no externals", () => {
    // Act
    const nested = findNestedLinkedExternals(root);

    // Assert
    expect(nested).toEqual([]);
  });
});

describe("describeNestedLinkedExternals", () => {
  it("names the package to add to serverExternalPackages, and the fallback", () => {
    // Arrange
    link("sanitize-html/node_modules/postcss", "postcss-16ee410f62bb922c");

    // Act
    const message = describeNestedLinkedExternals(findNestedLinkedExternals(root));

    // Assert
    expect(message).toContain('add "sanitize-html" to serverExternalPackages');
    expect(message).toContain("outputFileTracingIncludes");
  });
});
