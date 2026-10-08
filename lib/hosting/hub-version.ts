import { createHash } from "node:crypto";
import packageJson from "../../package.json";
import { type BuildIdentity, nullIfBlank } from "./build-identity";
import { resolveHubBuild as resolveHubBuildFromGit } from "./hub-build.mjs";

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
  git?: RunGit,
  env: ReleaseEnv = process.env,
): BuildIdentity {
  return resolveHubBuildFromGit(git, env);
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
