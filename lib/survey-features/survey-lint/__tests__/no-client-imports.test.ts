import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// The server reads these domains (the Audience tab, the bulk participant import), so they stay
// survey-core only: one client import here drags React or the Creator into a route.
const SURVEY_LINT_DIR = path.resolve(__dirname, "..");
const COVERAGE_DIR = path.resolve(
  __dirname,
  "../../../personalization/coverage",
);
const SERVER_SAFE_DIRS: [string, string][] = [
  ["survey-lint", SURVEY_LINT_DIR],
  ["personalization/coverage", COVERAGE_DIR],
];
const USE_CLIENT = /^\s*["']use client["']/m;
const CLIENT_PACKAGE =
  /^(react|react-dom|lucide-react|survey-creator-core|survey-react-ui)(\/|$)/;
const IMPORT_FROM = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(fullPath);
    }
    return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function importsOf(file: string): string[] {
  return [...readFileSync(file, "utf8").matchAll(IMPORT_FROM)].map(
    (match) => match[1],
  );
}

// An allowlist, not a denylist: an @/ alias can hide a client module.
const COVERAGE_PACKAGES =
  /^(survey-core(\/|$)|@\/lib\/survey-features\/survey-lint$|@\/lib\/endatix-api\/[\w-]+\/types$)/;
const TO_SURVEY_PRESETS = path.resolve(COVERAGE_DIR, "../to-survey-presets");

function coverageMayImport(file: string, spec: string): boolean {
  if (!spec.startsWith(".")) return COVERAGE_PACKAGES.test(spec);
  const target = path.resolve(path.dirname(file), spec);
  return (
    target === TO_SURVEY_PRESETS || target.startsWith(COVERAGE_DIR + path.sep)
  );
}

function offenders(dir: string, find: (file: string) => string[]): string[] {
  return sourceFiles(dir).flatMap((file) =>
    find(file).map((found) => `${path.relative(dir, file)}: ${found}`),
  );
}

describe("server-safe definition analysis", () => {
  it.each(SERVER_SAFE_DIRS)("has no client code in %s", (_name, dir) => {
    // Arrange
    const files = sourceFiles(dir);

    // Act
    const found = offenders(dir, (file) => [
      ...(USE_CLIENT.test(readFileSync(file, "utf8")) ? ['"use client"'] : []),
      ...importsOf(file).filter((spec) => CLIENT_PACKAGE.test(spec)),
    ]);

    // Assert
    expect(files).not.toEqual([]);
    expect(found).toEqual([]);
  });

  it("keeps survey-lint a leaf: survey-core and its own files only", () => {
    // Act
    const found = offenders(SURVEY_LINT_DIR, (file) =>
      importsOf(file).filter(
        (spec) => !spec.startsWith("./") && !/^survey-core(\/|$)/.test(spec),
      ),
    );

    // Assert
    expect(found).toEqual([]);
  });

  it("keeps coverage server-safe: survey-core, survey-lint, API types and its own files only", () => {
    // Act
    const found = [
      ...offenders(COVERAGE_DIR, (file) =>
        importsOf(file).filter((spec) => !coverageMayImport(file, spec)),
      ),
      // The one file outside coverage/ it reads: it may only import packages.
      ...importsOf(`${TO_SURVEY_PRESETS}.ts`)
        .filter((spec) => !COVERAGE_PACKAGES.test(spec))
        .map((spec) => `../to-survey-presets.ts: ${spec}`),
    ];

    // Assert
    expect(found).toEqual([]);
  });
});
