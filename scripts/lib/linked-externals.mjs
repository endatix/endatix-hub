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

/**
 * Each dependency of a linked external that would resolve to another version (or not
 * at all) once the link is dereferenced, nested ones included, parents first.
 * `into` is where the expected version has to be copied so both layouts resolve it.
 */
export function findMisresolvedDependencies(standaloneDir) {
  const problems = [];

  const visit = (owner, viewDir, hostDir, realDir) => {
    for (const name of Object.keys(readManifest(realDir).dependencies ?? {})) {
      const expected = findPackageDir(realDir, name, standaloneDir);
      if (expected === undefined) {
        continue;
      }
      const expectedVersion = readManifest(expected).version;
      const seen = findPackageDir(viewDir, name, standaloneDir);
      const seenVersion = seen && readManifest(seen).version;
      if (seenVersion === expectedVersion) {
        continue;
      }
      const into = path.join(hostDir, "node_modules", name);
      problems.push({ owner, name, expected, expectedVersion, seenVersion, into });
      visit(`${owner} > ${name}`, path.join(viewDir, "node_modules", name), into, expected);
    }
  };

  for (const link of linksIn(path.join(standaloneDir, ".next/node_modules"))) {
    const target = realpathSync(link);
    visit(path.relative(standaloneDir, link), link, target, target);
  }
  return problems;
}

// Folders are created writable rather than with the source's mode: fs.cpSync copies a
// read-only folder's mode first and then cannot write into it on a macOS folder
// bind-mounted into Docker, as dev containers run the build.
function copyPackage(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const source = path.join(from, entry);
    const target = path.join(to, entry);
    if (statSync(source).isDirectory()) {
      copyPackage(source, target);
    } else {
      copyFileSync(source, target);
    }
  }
}

/**
 * Copies every misresolved dependency into the linked package's own node_modules, so
 * the standalone runs the same with symlinks kept or dereferenced. Returns the copies.
 */
export function vendorLinkedExternals(standaloneDir) {
  const copies = findMisresolvedDependencies(standaloneDir);
  for (const { expected, into } of copies) {
    copyPackage(expected, into);
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
