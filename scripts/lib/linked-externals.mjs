import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";

// Turbopack links the externals it cannot load by name (a nested copy, such as
// sanitize-html's own postcss) into `.next/node_modules` as `<name>-<hash>` symlinks.
// Node resolves a linked package's dependencies from its real path. A host that
// dereferences symlinks on upload (Azure Static Web Apps, endatix-hub#1269) turns the
// link into a plain folder, and the same dependencies then resolve from the
// standalone's top-level node_modules: another version, or files tracing left out.

function readManifest(packageDir) {
  return JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf-8"));
}

/** Node's lookup for a bare package name from `fromDir`, without leaving `rootDir`. */
function findPackageDir(fromDir, name, rootDir) {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    if (path.basename(dir) !== "node_modules") {
      const candidate = path.join(dir, "node_modules", name);
      if (existsSync(path.join(candidate, "package.json"))) {
        return candidate;
      }
    }
    if (dir === rootDir || path.dirname(dir) === dir) {
      return undefined;
    }
  }
}

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

/** Files under `dir`, relative to it; `node_modules` at its top is left out when asked. */
function listFiles(dir, { withNodeModules }, prefix = "") {
  return readdirSync(path.join(dir, prefix)).flatMap((entry) => {
    const relative = path.join(prefix, entry);
    if (statSync(path.join(dir, relative)).isDirectory()) {
      if (!withNodeModules && prefix === "" && entry === "node_modules") {
        return [];
      }
      return listFiles(dir, { withNodeModules }, relative);
    }
    return [relative];
  });
}

/**
 * The same folder, or one with the same files: a copy tracing cut down shares the
 * version but not the files (endatix-hub#1269). Dependencies are compared separately.
 */
function samePackage(a, b) {
  if (realpathSync(a) === realpathSync(b)) {
    return true;
  }
  const files = listFiles(a, { withNodeModules: false }).sort();
  const others = listFiles(b, { withNodeModules: false }).sort();
  return (
    files.length === others.length &&
    files.every(
      (file, i) =>
        file === others[i] &&
        readFileSync(path.join(a, file)).equals(readFileSync(path.join(b, file))),
    )
  );
}

const versionOf = (packageDir) => readManifest(packageDir).version;

/**
 * Dependencies of the package at `realDir` that would load other files from `viewDir`,
 * its place in a dereferenced copy. `ancestors` holds the real folders already on the
 * path: a dependency that closes a cycle is still compared, but not walked again, so
 * the cycle ends instead of recursing deeper forever.
 */
function collectMisresolved(standaloneDir, owner, viewDir, hostDir, realDir, ancestors) {
  const problems = [];
  for (const name of Object.keys(readManifest(realDir).dependencies ?? {})) {
    const expected = findPackageDir(realDir, name, standaloneDir);
    if (expected === undefined) {
      continue;
    }
    const closesCycle = ancestors.has(realpathSync(expected));
    const nested = new Set(ancestors).add(realpathSync(expected));
    const child = `${owner} > ${name}`;
    const seen = findPackageDir(viewDir, name, standaloneDir);
    const resolvesAlike =
      seen !== undefined &&
      samePackage(seen, expected) &&
      (closesCycle ||
        collectMisresolved(standaloneDir, child, seen, seen, expected, nested).length === 0);
    if (resolvesAlike) {
      continue;
    }
    const into = path.join(hostDir, "node_modules", name);
    const problem = {
      owner,
      name,
      expected,
      expectedVersion: versionOf(expected),
      seenVersion: seen && versionOf(seen),
      into,
    };
    const below = closesCycle
      ? []
      : collectMisresolved(
          standaloneDir,
          child,
          path.join(viewDir, "node_modules", name),
          into,
          expected,
          nested,
        );
    problems.push(problem, ...below);
  }
  return problems;
}

/**
 * Each dependency of a linked external that would load other files once the link is
 * dereferenced, nested ones included, parents first. `into` is where the expected
 * folder has to be copied so both layouts resolve it.
 */
export function findMisresolvedDependencies(standaloneDir) {
  return linksIn(path.join(standaloneDir, ".next/node_modules")).flatMap((link) => {
    const target = realpathSync(link);
    return collectMisresolved(
      standaloneDir,
      path.relative(standaloneDir, link),
      link,
      target,
      target,
      new Set([target]),
    );
  });
}

// Lists every file before writing one, so a copy into the source's own subfolder (a
// dependency that is an ancestor of the linked package) does not copy its own output.
// Folders are created writable rather than with the source's mode: fs.cpSync copies a
// read-only folder's mode first and then cannot write into it on a macOS folder
// bind-mounted into Docker, as dev containers run the build.
function copyPackage(from, to) {
  for (const file of listFiles(from, { withNodeModules: true })) {
    mkdirSync(path.dirname(path.join(to, file)), { recursive: true });
    copyFileSync(path.join(from, file), path.join(to, file));
  }
}

/**
 * Copies every misresolved dependency into the linked package's own node_modules, so
 * the standalone runs the same with symlinks kept or dereferenced. Returns the copies.
 */
export function vendorLinkedExternals(standaloneDir) {
  const copies = [];
  for (const problem of findMisresolvedDependencies(standaloneDir)) {
    // A parent copy already brought it: Node finds it at that same place from the
    // real path first, and its read-only files cannot be overwritten.
    if (existsSync(path.join(problem.into, "package.json"))) {
      continue;
    }
    copyPackage(problem.expected, problem.into);
    copies.push(problem);
  }

  const remaining = findMisresolvedDependencies(standaloneDir);
  if (remaining.length > 0) {
    throw new Error(
      `linked externals still misresolve: ${remaining.map(describeProblem).join("; ")}`,
    );
  }
  return copies;
}

export function describeProblem({ owner, name, expectedVersion, seenVersion }) {
  return `${owner} needs ${name}@${expectedVersion}, resolves ${seenVersion ?? "nothing"}`;
}
