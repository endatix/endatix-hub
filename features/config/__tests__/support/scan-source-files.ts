import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Repo scan for boundary guards.
 *
 * Deliberately not `git grep`: that searches tracked content only, so a file added in the
 * very change under review is invisible to it — even after `git add -N`. A guard that
 * cannot see new files fails to guard the case it exists for.
 */

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  ".coverage",
  "coverage",
  "dist",
  "build",
  "playwright-report",
  "test-results",
]);

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

function isTestPath(relativePath: string): boolean {
  return (
    relativePath.includes("__tests__") ||
    relativePath.includes(".test.") ||
    relativePath.includes(".spec.")
  );
}

function* walk(root: string, current: string): Generator<string> {
  for (const entry of readdirSync(current)) {
    if (entry.startsWith(".") && entry !== ".") {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
    }
    const absolute = path.join(current, entry);
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      yield* walk(root, absolute);
      continue;
    }

    if (SOURCE_EXTENSIONS.includes(path.extname(entry))) {
      yield path.relative(root, absolute);
    }
  }
}

/**
 * Every non-test `.ts`/`.tsx` file under `root` whose contents match `pattern`.
 *
 * @returns repo-relative paths, sorted, so assertion output is stable.
 */
export function scanSourceFiles(root: string, pattern: RegExp): string[] {
  const matches: string[] = [];

  for (const relativePath of walk(root, root)) {
    if (isTestPath(relativePath)) continue;
    const source = readFileSync(path.join(root, relativePath), "utf-8");
    // Reset between files: a /g or /y pattern otherwise carries lastIndex across calls.
    pattern.lastIndex = 0;
    if (pattern.test(source)) {
      matches.push(relativePath);
    }
  }

  return matches.sort((a, b) => a.localeCompare(b));
}
