import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findMisresolvedDependencies,
  vendorLinkedExternals,
} from "../lib/linked-externals.mjs";

const libraryPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../lib/linked-externals.mjs",
);

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

// Layouts from the review of endatix-hub#1270 (endatix-hub#1275). None occurs on today's
// lockfile; each takes one `pnpm update`.
describe("dependency layouts that repeat or nest", () => {
  let layout: string;

  type Package = { version: string; dependencies?: Record<string, string>; files?: Record<string, string> };

  function build(packages: Record<string, Package>, link: string) {
    layout = mkdtempSync(path.join(tmpdir(), "linked-externals-layout-"));
    for (const [dir, { files = {}, ...manifest }] of Object.entries(packages)) {
      writePackage(path.join(layout, dir), { name: path.basename(dir), ...manifest });
      for (const [file, content] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(layout, dir, file)), { recursive: true });
        writeFileSync(path.join(layout, dir, file), content);
      }
    }
    mkdirSync(path.join(layout, ".next/node_modules"), { recursive: true });
    const linkPath = path.join(layout, ".next/node_modules", `${path.basename(link)}-16ee410f62bb922c`);
    symlinkSync(path.relative(path.dirname(linkPath), path.join(layout, link)), linkPath);
    return linkPath;
  }

  /** The folder a dereferenced copy of the link loads `names` from, one level per name. */
  function resolvedFromDereferencedCopy(linkPath: string, ...names: string[]) {
    const copy = mkdtempSync(path.join(tmpdir(), "linked-externals-copy-"));
    try {
      cpSync(layout, copy, { recursive: true, dereference: true });
      let from = path.join(copy, path.relative(layout, linkPath));
      for (const name of names) {
        from = path.dirname(createRequire(path.join(from, "index.js")).resolve(`${name}/package.json`));
      }
      return { version: versionAt(from), files: readdirSync(from).sort() };
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  }

  afterEach(() => {
    if (layout !== undefined) {
      execFileSync("chmod", ["-R", "u+w", layout]);
      rmSync(layout, { recursive: true, force: true });
    }
  });

  it("returns on a dependency cycle", () => {
    build(
      {
        "node_modules/a": { version: "1.0.0" },
        "node_modules/b": { version: "1.0.0" },
        "node_modules/sanitize-html/node_modules/postcss": { version: "8.5.31", dependencies: { a: "^2" } },
        "node_modules/sanitize-html/node_modules/a": { version: "2.0.0", dependencies: { b: "^2" } },
        "node_modules/sanitize-html/node_modules/b": { version: "2.0.0", dependencies: { a: "^2" } },
      },
      "node_modules/sanitize-html/node_modules/postcss",
    );

    // In a child process: an endless walk would otherwise hang the test runner.
    const run = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { findMisresolvedDependencies } from ${JSON.stringify(pathToFileURL(libraryPath).href)};
         console.log(JSON.stringify(findMisresolvedDependencies(process.argv[1]).map((p) => p.owner + " > " + p.name)));`,
        layout,
      ],
      { encoding: "utf-8", timeout: 10_000 },
    );

    expect(run.error).toBeUndefined();
    expect(JSON.parse(run.stdout)).toEqual([
      ".next/node_modules/postcss-16ee410f62bb922c > a",
      ".next/node_modules/postcss-16ee410f62bb922c > a > b",
    ]);
  });

  it("vendors a dependency that is an ancestor of the linked package", () => {
    const linkPath = build(
      {
        "node_modules/a": { version: "1.0.0" },
        "node_modules/c/node_modules/a": { version: "2.0.0" },
        "node_modules/c/node_modules/a/node_modules/b": { version: "1.0.0", dependencies: { a: "^2" } },
      },
      "node_modules/c/node_modules/a/node_modules/b",
    );

    vendorLinkedExternals(layout);

    expect(resolvedFromDereferencedCopy(linkPath, "a").version).toBe("2.0.0");
  });

  it("vendors overlapping dependencies whose files are read-only", () => {
    const linkPath = build(
      {
        "node_modules/a": { version: "1.0.0" },
        "node_modules/x": { version: "1.0.0" },
        "node_modules/sanitize-html/node_modules/postcss": { version: "8.5.31", dependencies: { a: "^2" } },
        "node_modules/sanitize-html/node_modules/a": { version: "2.0.0", dependencies: { x: "^2" } },
        "node_modules/sanitize-html/node_modules/a/node_modules/x": { version: "2.0.0" },
      },
      "node_modules/sanitize-html/node_modules/postcss",
    );
    chmodSync(path.join(layout, "node_modules/sanitize-html/node_modules/a/node_modules/x/package.json"), 0o444);

    vendorLinkedExternals(layout);

    expect(resolvedFromDereferencedCopy(linkPath, "a", "x").version).toBe("2.0.0");
  });

  it("vendors a same-version copy that tracing cut down", () => {
    const linkPath = build(
      {
        "node_modules/nanoid": { version: "3.3.20" },
        "node_modules/sanitize-html/node_modules/postcss": { version: "8.5.31", dependencies: { nanoid: "^3.3.20" } },
        "node_modules/sanitize-html/node_modules/nanoid": {
          version: "3.3.20",
          files: { "non-secure/index.cjs": "module.exports = {};" },
        },
      },
      "node_modules/sanitize-html/node_modules/postcss",
    );

    expect(findMisresolvedDependencies(layout).map((problem) => problem.name)).toEqual(["nanoid"]);
    vendorLinkedExternals(layout);

    expect(resolvedFromDereferencedCopy(linkPath, "nanoid").files).toEqual(["non-secure", "package.json"]);
  });

  it("checks the dependencies of an identical copy that resolves from elsewhere", () => {
    const nanoid = { version: "3.3.20", dependencies: { z: "^2" }, files: { "index.cjs": "module.exports = {};" } };
    const linkPath = build(
      {
        "node_modules/nanoid": nanoid,
        "node_modules/z": { version: "1.0.0" },
        "node_modules/sanitize-html/node_modules/postcss": { version: "8.5.31", dependencies: { nanoid: "^3.3.20" } },
        "node_modules/sanitize-html/node_modules/nanoid": nanoid,
        "node_modules/sanitize-html/node_modules/z": { version: "2.0.0" },
      },
      "node_modules/sanitize-html/node_modules/postcss",
    );

    vendorLinkedExternals(layout);

    expect(resolvedFromDereferencedCopy(linkPath, "nanoid", "z").version).toBe("2.0.0");
  });
});
