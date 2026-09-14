import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
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
    const nodeEngine = (packageJson.engines as Record<string, string>).node;

    // Act
    const pinned = PNPM_VERSION_PINS.map(([file, pattern]) => {
      const version = pattern.exec(read(file))?.[1];
      expect(version, `no pnpm version found in ${file}`).toBeDefined();
      return version as string;
    });
    const major = Number(pinned[0].split(".")[0]);

    // Assert
    expect(new Set(pinned).size, `pins disagree: ${pinned.join(", ")}`).toBe(1);
    expect(major).toBeGreaterThanOrEqual(10);
    expect(major).toBeLessThan(13);
    expect(engines).toMatch(/>=10\.34\.5/);
    expect(engines).toMatch(/<13\.0\.0/);
    expect(nodeEngine).toMatch(/^>=22\.13\.0/);
  });
});
