import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import packageJson from "../../package.json";
import { type BuildIdentity, nullIfBlank } from "./build-identity";

/** Committed in package.json (`0.0.0-local`) and used by CI validation builds (`0.0.0-ci`); never a release. */
const NOT_A_RELEASE_PREFIX = "0.0.0";

type RunGit = (args: string[]) => string;

/** The GitHub Actions ref, when this build has one. Not the rest of the process environment. */
type ReleaseEnv = {
  GITHUB_REF_TYPE?: string;
  GITHUB_HEAD_REF?: string;
  GITHUB_REF_NAME?: string;
};

/**
 * The Hub build shown in About. `next.config.ts` resolves it once at build
 * ({@link resolveHubBuild}) and inlines `HUB_VERSION`, `HUB_BRANCH` and
 * `HUB_COMMIT`, so the running server needs no git.
 */
export function getHubBuild(): BuildIdentity {
  return {
    version: nullIfBlank(process.env.HUB_VERSION) ?? stampedVersion(),
    branch: nullIfBlank(process.env.HUB_BRANCH),
    commit: nullIfBlank(process.env.HUB_COMMIT),
  };
}

/**
 * Build time only.
 * - version: the one our release pipeline stamped into package.json
 *   (Dockerfile `HUB_VERSION`); else, on a release line, the tag HEAD sits
 *   exactly on. A feature branch on a tagged commit is still a feature build.
 * - branch: only for a build that is not a release. A detached checkout
 *   takes `GITHUB_HEAD_REF` / `GITHUB_REF_NAME` only when `GITHUB_REF_TYPE`
 *   is a branch. A tag checkout is a release line.
 * - commit: HEAD.
 * Without git every field the repository would answer is null.
 */
export function resolveHubBuild(
  git: RunGit = runGit,
  env: ReleaseEnv = process.env,
): BuildIdentity {
  const branch = resolveBranch(git, env);
  const version =
    stampedVersion() ?? (isReleaseLine(branch) ? releaseTagAtHead(git) : null);
  const commit = tryGit(git, ["rev-parse", "HEAD"]);

  return { version, branch: version ? null : branch, commit };
}

/** Skew-protection id for `deploymentId`: stable per build, never the semver itself. */
export function getHubDeploymentId(
  build: BuildIdentity = getHubBuild(),
): string {
  const key = build.version ?? build.commit ?? packageJson.version;
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function stampedVersion(): string | null {
  return packageJson.version.startsWith(NOT_A_RELEASE_PREFIX)
    ? null
    : packageJson.version;
}

/** `main`, a hotfix line, or a checkout that names no branch (a tag checkout). */
function isReleaseLine(branch: string | null): boolean {
  return branch === null || branch === "main" || branch.startsWith("hotfix/");
}

function releaseTagAtHead(git: RunGit): string | null {
  const tag = tryGit(git, [
    "describe",
    "--tags",
    "--exact-match",
    "--match",
    "v[0-9]*",
  ]);
  return tag ? tag.replace(/^v/, "") : null;
}

function resolveBranch(git: RunGit, env: ReleaseEnv): string | null {
  const branch = tryGit(git, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch && branch !== "HEAD") {
    return branch;
  }

  if (env.GITHUB_REF_TYPE === "tag") {
    return null;
  }

  return nullIfBlank(env.GITHUB_HEAD_REF) ?? nullIfBlank(env.GITHUB_REF_NAME);
}

function tryGit(git: RunGit, args: string[]): string | null {
  try {
    return nullIfBlank(git(args));
  } catch {
    return null;
  }
}

/**
 * Where git is installed on the machines that build the Hub: Linux, Alpine
 * (Docker build stage), GitHub runners and macOS (`/usr/bin`), Homebrew, and
 * Git for Windows. A fixed path, not a `PATH` lookup, so a writable directory
 * on `PATH` cannot substitute another `git` (Sonar S4036). Not found: the build
 * has no git, and the build identity stays empty.
 */
const GIT_EXECUTABLES = [
  "/usr/bin/git",
  "/usr/local/bin/git",
  "/opt/homebrew/bin/git",
  String.raw`C:\Program Files\Git\cmd\git.exe`,
];

function runGit(args: string[]): string {
  const git = GIT_EXECUTABLES.find((candidate) => existsSync(candidate));
  if (!git) {
    throw new Error("git is not installed in a known location");
  }

  return execFileSync(git, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}
