import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";

// Turbopack links each external into `.next/node_modules` as a `<name>-<hash>` symlink.
// A host that dereferences symlinks on upload (Azure Static Web Apps, endatix-hub#1269)
// turns the link into a plain folder, and Node then resolves the package's dependencies
// from that folder instead of its real path. For a top-level package both lookups end in
// the standalone's top-level node_modules, so it loads the same code. A nested copy (a
// dependency's own postcss, say) loses the folders next to it.

function linksIn(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);
    if (lstatSync(entryPath).isSymbolicLink()) {
      return [entryPath];
    }
    return entry.startsWith("@") ? linksIn(entryPath) : [];
  });
}

/** The link's target relative to the top-level node_modules, or undefined when it is missing. */
function targetOf(link, topLevel) {
  try {
    return path.relative(topLevel, realpathSync(link));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/** The package whose own node_modules holds `target`: what to load by name instead. */
function parentOf(target) {
  const segments = target.split(path.sep);
  const last = segments.lastIndexOf("node_modules");
  return last > 0 ? segments.slice(0, last).join("/") : undefined;
}

/**
 * Linked externals whose real folder is not a top-level package of the standalone, and
 * links whose target is missing (`target` undefined).
 */
export function findNestedLinkedExternals(standaloneDir) {
  const topLevel = path.join(realpathSync(standaloneDir), "node_modules");
  return linksIn(path.join(standaloneDir, ".next/node_modules"))
    .map((link) => {
      const target = targetOf(link, topLevel);
      return {
        link: path.relative(standaloneDir, link),
        target,
        parent: target === undefined || target.startsWith("..") ? undefined : parentOf(target),
      };
    })
    .filter(
      ({ target }) =>
        target === undefined ||
        target.startsWith("..") ||
        target.split(path.sep).includes("node_modules"),
    );
}

export function describeNestedLinkedExternals(nested) {
  const lines = nested.map(({ link, target, parent }) => {
    if (target === undefined) {
      return `   - ${link} -> missing target`;
    }
    const fix = parent === undefined ? "" : `: add "${parent}" to serverExternalPackages`;
    return `   - ${link} -> node_modules/${target.split(path.sep).join("/")}${fix}`;
  });
  return (
    "Turbopack links nested copies, which break with symlinks dereferenced (Azure Static " +
    "Web Apps). Load the package that holds each one by name in next.config.ts:\n" +
    `${lines.join("\n")}\n` +
    "   When that package has to stay bundled, dedupe the nested version in the lockfile, " +
    "or as a last resort list its dependencies in outputFileTracingIncludes."
  );
}
