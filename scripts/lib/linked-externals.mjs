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

/** Linked externals whose real folder is not a top-level package of the standalone. */
export function findNestedLinkedExternals(standaloneDir) {
  const topLevel = path.join(realpathSync(standaloneDir), "node_modules");
  return linksIn(path.join(standaloneDir, ".next/node_modules"))
    .map((link) => ({
      link: path.relative(standaloneDir, link),
      target: path.relative(topLevel, realpathSync(link)),
    }))
    .filter(
      ({ target }) =>
        target.startsWith("..") || target.split(path.sep).includes("node_modules"),
    );
}
