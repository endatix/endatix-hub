import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import semver from "semver";
import { describe, expect, it } from "vitest";

/**
 * pnpm configuration has one home: `pnpm-workspace.yaml`. pnpm 11+ ignores
 * `package.json#pnpm` and reads only auth keys from `.npmrc`, so a setting written
 * anywhere else is silently dropped instead of failing — which is how the config
 * drifted across three files before the pnpm 12 upgrade. These guards fail the build
 * instead of the install.
 */

const REPO_ROOT = path.resolve(__dirname, "..");

const read = (file: string) =>
  readFileSync(path.join(REPO_ROOT, file), "utf-8");

const packageJson = JSON.parse(read("package.json")) as Record<string, unknown>;
const workspaceYaml = read("pnpm-workspace.yaml");

/** Every place the pinned pnpm version is written, and how to find it. */
const PNPM_VERSION_PINS: Array<[file: string, pattern: RegExp]> = [
  ["Dockerfile", /pnpm@(\d+\.\d+\.\d+)/],
  [".github/actions/setup-node-pnpm/action.yml", /default: "(\d+\.\d+\.\d+)"/],
];

/**
 * pnpm below these versions leaks environment secrets through proxy settings in a
 * `pnpm-workspace.yaml` (GHSA-vx52-2968-3vc6) - the file this repo ships. The 11.x
 * window is easy to reopen by "simplifying" engines.pnpm into a single range.
 */
const PNPM_VULNERABLE_VERSIONS = ["10.34.4", "11.0.0", "11.10.9"];

/** Node versions engines.node must never admit (EOL, odd-year 23, or Node 25). */
const UNSUPPORTED_NODE_VERSIONS = [
  "20.19.0",
  "21.7.3",
  "23.11.0",
  "25.0.0",
  "25.1.0",
];

describe("pnpm configuration stays in pnpm-workspace.yaml", () => {
  it("keeps no pnpm settings in package.json", () => {
    // Act & Assert
    expect(packageJson).not.toHaveProperty("pnpm");
    expect(packageJson).not.toHaveProperty("overrides");
  });

  it("has no .npmrc holding non-auth settings", () => {
    // Arrange
    const npmrc = existsSync(path.join(REPO_ROOT, ".npmrc"))
      ? read(".npmrc")
      : "";

    // Act & Assert
    expect(npmrc).not.toMatch(
      /node-linker|shared-workspace-lockfile|override/i,
    );
  });

  it("never sets sharedWorkspaceLockfile", () => {
    // A workspace root with per-project lockfiles and nodeLinker: hoisted fails every
    // pnpm 10 install with ERR_PNPM_MISSING_HOISTED_LOCATIONS.
    expect(workspaceYaml).not.toMatch(/^\s*sharedWorkspaceLockfile\s*:/m);
  });
});

describe("pnpm toolchain pins agree", () => {
  it("declares no packageManager field, because Corepack cannot run pnpm 12", () => {
    expect(packageJson).not.toHaveProperty("packageManager");
  });

  it("pins the same pnpm version everywhere, inside the supported range", () => {
    // Arrange
    const engines = (packageJson.engines as Record<string, string>).pnpm;

    // Act
    const pinned = PNPM_VERSION_PINS.map(([file, pattern]) => {
      const version = pattern.exec(read(file))?.[1];
      expect(version, `no pnpm version found in ${file}`).toBeDefined();
      return version as string;
    });

    // Assert
    expect(new Set(pinned).size, `pins disagree: ${pinned.join(", ")}`).toBe(1);
    expect(
      semver.satisfies(pinned[0], engines),
      `pnpm ${pinned[0]} is outside engines.pnpm (${engines})`,
    ).toBe(true);
  });

  it("keeps engines.pnpm clear of the GHSA-vx52-2968-3vc6 versions", () => {
    // Arrange
    const engines = (packageJson.engines as Record<string, string>).pnpm;

    // Act & Assert
    for (const vulnerable of PNPM_VULNERABLE_VERSIONS) {
      expect(
        semver.satisfies(vulnerable, engines),
        `engines.pnpm (${engines}) admits vulnerable pnpm ${vulnerable}`,
      ).toBe(false);
    }
  });
});

/**
 * Node has one pin - `.nvmrc`. CI reads it through `node-version-file`, the Dockerfile
 * repeats only its major, and `engines.node` is the range self-hosters are held to (it
 * is also what `lib/hosting/check-node-version.ts` warns against at startup). Bumping
 * Node means editing `.nvmrc`, and these guards catch every copy left behind.
 */
describe("Node toolchain pins agree", () => {
  const nodeEngine = (packageJson.engines as Record<string, string>).node;
  const nvmrc = read(".nvmrc").trim();

  it("pins a concrete version in .nvmrc, so `nvm use` cannot pick an older 22.x", () => {
    // Act & Assert
    expect(
      semver.valid(nvmrc),
      `.nvmrc must hold an exact version, got "${nvmrc}"`,
    ).not.toBeNull();
  });

  it("keeps the .nvmrc version inside engines.node", () => {
    // Act & Assert
    expect(
      semver.satisfies(nvmrc, nodeEngine),
      `.nvmrc (${nvmrc}) is outside engines.node (${nodeEngine})`,
    ).toBe(true);
  });

  it("builds the image on the same Node major", () => {
    // Arrange
    const image = /^FROM node:(\d+)-alpine/m.exec(read("Dockerfile"))?.[1];

    // Act & Assert
    expect(
      image,
      "no `FROM node:<major>-alpine` found in Dockerfile",
    ).toBeDefined();
    expect(
      image,
      `Dockerfile runs Node ${image} while .nvmrc pins ${nvmrc}`,
    ).toBe(semver.major(nvmrc).toString());
  });

  it("lets CI read .nvmrc instead of repeating the version", () => {
    // Arrange
    const action = read(".github/actions/setup-node-pnpm/action.yml");

    // Act & Assert
    expect(action).toMatch(/node-version-file:\s*"\.nvmrc"/);
    expect(action, "hardcoded node-version drifts from .nvmrc").not.toMatch(
      /^\s*node-version:/m,
    );
  });

  it("pins engines.node to 22.13+ and 24 LTS only", () => {
    expect(nodeEngine).toBe(">=22.13.0 <23.0.0 || >=24.0.0 <25.0.0");
  });

  it("admits no End-of-Life or out-of-policy Node major", () => {
    // Act & Assert
    for (const unsupported of UNSUPPORTED_NODE_VERSIONS) {
      expect(
        semver.satisfies(unsupported, nodeEngine),
        `engines.node (${nodeEngine}) admits unsupported Node ${unsupported}`,
      ).toBe(false);
    }
  });
});
