import { createHash } from "node:crypto";
import packageJson from "../../package.json";
import { type BuildIdentity, nullIfBlank } from "./build-identity";
import {
  SURVEYJS_PACKAGES,
  type SurveyJsPackage,
} from "./surveyjs-packages.mjs";

/** Installed version per SurveyJS package; null when the build could not read it. */
export type SurveyJsVersions = Readonly<Record<SurveyJsPackage, string | null>>;

/** Committed in package.json (`0.0.0-local`) and used by CI validation builds (`0.0.0-ci`); never a release. */
const NOT_A_RELEASE_PREFIX = "0.0.0";

/**
 * The Hub build shown in About. `next.config.ts` resolves it once, from
 * `hub-build.mjs`, and inlines `HUB_VERSION`, `HUB_BRANCH` and `HUB_COMMIT`.
 * This module must not import that file: its `git` call makes Turbopack trace
 * the whole project into the server bundle.
 */
export function getHubBuild(): BuildIdentity {
  return {
    version: nullIfBlank(process.env.HUB_VERSION) ?? stampedVersion(),
    branch: nullIfBlank(process.env.HUB_BRANCH),
    commit: nullIfBlank(process.env.HUB_COMMIT),
  };
}

/** The SurveyJS versions `next.config.ts` inlined as `HUB_SURVEYJS_VERSIONS` (JSON). */
export function getSurveyJsVersions(): SurveyJsVersions {
  const inlined = parseObject(process.env.HUB_SURVEYJS_VERSIONS);
  return Object.fromEntries(
    SURVEYJS_PACKAGES.map((name) => {
      const version = inlined[name];
      return [name, typeof version === "string" ? nullIfBlank(version) : null];
    }),
  ) as SurveyJsVersions;
}

function parseObject(json: string | undefined): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(json ?? "");
    return value && typeof value === "object" ? { ...value } : {};
  } catch {
    return {};
  }
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
