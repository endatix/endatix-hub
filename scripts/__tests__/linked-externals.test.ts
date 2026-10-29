import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findMisresolvedDependencies,
  vendorLinkedExternals,
} from "../lib/linked-externals.mjs";

// A standalone folder shaped like the Hub's: sanitize-html's own postcss is linked into
// .next/node_modules, its nanoid sits next to it, and an older nanoid is hoisted.
let root: string;

function writePackage(dir: string, manifest: object) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify(manifest));
}

function versionAt(dir: string) {
  return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf-8")).version;
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "linked-externals-"));
  const nested = path.join(root, "node_modules/sanitize-html/node_modules");
  writePackage(path.join(nested, "postcss"), {
    name: "postcss",
    version: "8.5.31",
    dependencies: { nanoid: "^3.3.20", picocolors: "^1.1.1" },
  });
  writePackage(path.join(nested, "nanoid"), { name: "nanoid", version: "3.3.20" });
  writePackage(path.join(root, "node_modules/nanoid"), { name: "nanoid", version: "3.3.19" });
  writePackage(path.join(root, "node_modules/picocolors"), { name: "picocolors", version: "1.1.1" });
  writePackage(path.join(root, "node_modules/sharp"), {
    name: "sharp",
    version: "0.35.5",
    dependencies: { picocolors: "^1.1.1" },
  });

  mkdirSync(path.join(root, ".next/node_modules"), { recursive: true });
  symlinkSync(
    "../../node_modules/sanitize-html/node_modules/postcss",
    path.join(root, ".next/node_modules/postcss-16ee410f62bb922c"),
  );
  symlinkSync("../../node_modules/sharp", path.join(root, ".next/node_modules/sharp-20c6a5da84e2135f"));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("findMisresolvedDependencies", () => {
  it("reports a dependency that resolves to another version once the link is a plain folder", () => {
    const problems = findMisresolvedDependencies(root);

    expect(problems).toEqual([
      expect.objectContaining({
        owner: ".next/node_modules/postcss-16ee410f62bb922c",
        name: "nanoid",
        expectedVersion: "3.3.20",
        seenVersion: "3.3.19",
      }),
    ]);
  });

  it("ignores a linked package that resolves its dependencies from the top level either way", () => {
    const owners = findMisresolvedDependencies(root).map((problem) => problem.owner);

    expect(owners).not.toContain(".next/node_modules/sharp-20c6a5da84e2135f");
  });

  it("fails on an unreadable manifest instead of reporting nothing", () => {
    writeFileSync(path.join(root, "node_modules/sanitize-html/node_modules/postcss/package.json"), "{");

    expect(() => findMisresolvedDependencies(root)).toThrow(SyntaxError);
  });
});

describe("vendorLinkedExternals", () => {
  it("copies the expected version into the linked package so a dereferenced copy resolves it", () => {
    vendorLinkedExternals(root);

    expect(findMisresolvedDependencies(root)).toEqual([]);

    const dereferenced = mkdtempSync(path.join(tmpdir(), "linked-externals-copy-"));
    try {
      cpSync(root, dereferenced, { recursive: true, dereference: true });
      expect(
        versionAt(path.join(dereferenced, ".next/node_modules/postcss-16ee410f62bb922c/node_modules/nanoid")),
      ).toBe("3.3.20");
    } finally {
      rmSync(dereferenced, { recursive: true, force: true });
    }
  });

  it("copies a package whose folders are read-only, as pnpm's store can leave them", () => {
    const nanoid = path.join(root, "node_modules/sanitize-html/node_modules/nanoid");
    const nonSecure = path.join(nanoid, "non-secure");
    writePackage(nonSecure, { type: "commonjs" });
    writeFileSync(path.join(nonSecure, "index.cjs"), "module.exports = {};");
    chmodSync(path.join(nonSecure, "index.cjs"), 0o444);
    chmodSync(nonSecure, 0o555);

    try {
      vendorLinkedExternals(root);
    } finally {
      chmodSync(nonSecure, 0o755);
    }

    const vendored = path.join(
      root,
      "node_modules/sanitize-html/node_modules/postcss/node_modules/nanoid/non-secure/index.cjs",
    );
    expect(readFileSync(vendored, "utf-8")).toBe("module.exports = {};");
  });

  it("leaves packages that already resolve the same version alone", () => {
    const copies = vendorLinkedExternals(root);

    expect(copies.map((copy) => copy.name)).toEqual(["nanoid"]);
  });
});
