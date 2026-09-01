import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "../../..");

/**
 * A `NEXT_PUBLIC_`-prefixed value is inlined into the client bundle at build time, so the
 * only way to change one is to rebuild and redeploy the image. Everything public must
 * therefore go through the request-time projection instead.
 *
 * Licence keys are the case this rule exists for: replacing one must always be a config
 * change, never a rebuild.
 */

/** The deprecated-env shim. Server-only by contract; the second test enforces it. */
const LEGACY_SERVER_MODULE = "features/config/legacy-public-env.server.ts";

/** Documented build-time `NEXT_PUBLIC_*` reads and the deprecated-env shim. */
const ALLOWED_BUILD_TIME_READS = [
  // basePath feeds next.config.ts, which Next resolves at build. No runtime equivalent.
  "lib/hosting/base-path.ts",
  "proxy.ts",
  "features/forms/use-cases/create-form/resolve-default-create-folder.ts",
  "features/auth/infrastructure/auth-logout.utils.ts",
  // Deprecated fallbacks. Safe ONLY while no client component imports it — asserted below.
  LEGACY_SERVER_MODULE,
];

/** `git grep` exits 1 when nothing matches, which is success here, not failure. */
function gitGrepFiles(pattern: string): string[] {
  let out: string;
  try {
    out = execFileSync(
      "git",
      ["grep", "-l", "--", pattern, "--", "*.ts", "*.tsx"],
      { cwd: REPO_ROOT, encoding: "utf-8" },
    );
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 1) {
      return [];
    }
    throw error;
  }

  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.includes("__tests__") && !file.includes(".test."));
}

/**
 * Reads the working tree, not `HEAD`: the point of this guard is to fail on the change
 * being written, and `git show HEAD:<file>` both misses uncommitted edits and throws
 * outright on a file that has not been committed yet.
 */
function isClientModule(file: string): boolean {
  const source = readFileSync(path.join(REPO_ROOT, file), "utf-8");
  return /^\s*["']use client["']/m.test(source);
}

describe("public client config stays request-time", () => {
  it("has no build-time env reads outside the documented exceptions", () => {
    const offenders = gitGrepFiles("process\\.env\\.NEXT_PUBLIC_").filter(
      (file) => !ALLOWED_BUILD_TIME_READS.includes(file),
    );

    expect(
      offenders,
      "These files read a NEXT_PUBLIC_-prefixed env var, which Next inlines at build " +
        "time. Add the value to ClientEndatixConfig and read it from the request-time " +
        "projection instead. See features/config/client-endatix-config.ts.",
    ).toEqual([]);
  });

  it("keeps the deprecated fallbacks out of every client-reachable module", () => {
    // The exemption above is only sound while this module stays server-side: one import
    // from a "use client" file is enough for Next to inline every literal inside it.
    const importers = gitGrepFiles("legacy-public-env.server").filter(
      (file) => file !== LEGACY_SERVER_MODULE,
    );
    const clientImporters = importers.filter(isClientModule);

    expect(
      clientImporters,
      `${LEGACY_SERVER_MODULE} is imported by a client component, so its deprecated ` +
        "NEXT_PUBLIC_-prefixed reads are now inlined into the browser bundle. Read them " +
        "on the server and pass the value down instead.",
    ).toEqual([]);
  });
});
