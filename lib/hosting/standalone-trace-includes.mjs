// Output tracing additions for hosts that dereference symlinks (endatix-hub#1269).
// Azure Static Web Apps does this when it uploads a hybrid Next.js app. Turbopack loads
// a nested external, such as sanitize-html's own postcss, through a
// `.next/node_modules/<name>-<hash>` symlink; once that link is a plain folder, the
// package resolves its dependencies from the top-level node_modules, where tracing keeps
// only what something else needed. scripts/check-dereferenced-standalone.mjs guards it.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hubRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Nested externals Turbopack links into `.next/node_modules`. */
const NESTED_EXTERNALS = ["sanitize-html/node_modules/postcss"];

/**
 * @typedef {{ dependencies?: Record<string, string> }} PackageManifest
 * @param {string} packageDir relative to node_modules
 * @returns {PackageManifest | undefined}
 */
function readInstalledManifest(packageDir) {
  try {
    return JSON.parse(
      readFileSync(
        path.join(hubRoot, "node_modules", packageDir, "package.json"),
        "utf-8",
      ),
    );
  } catch {
    return undefined;
  }
}

/**
 * Globs that keep each nested external's dependencies whole in the top-level
 * node_modules of the standalone build. None when the external is not nested.
 * @param {(packageDir: string) => PackageManifest | undefined} [readManifest]
 * @returns {string[]}
 */
export function dereferencedExternalTraceIncludes(
  readManifest = readInstalledManifest,
) {
  const dependencies = NESTED_EXTERNALS.flatMap((packageDir) =>
    Object.keys(readManifest(packageDir)?.dependencies ?? {}),
  );
  return [...new Set(dependencies)].map(
    (dependency) => `./node_modules/${dependency}/**/*`,
  );
}
