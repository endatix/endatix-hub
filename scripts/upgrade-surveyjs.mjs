#!/usr/bin/env node

/**
 * Upgrade Survey.js packages in hub/package.json.
 * Usage: node upgrade-surveyjs.mjs [version]
 *   - With version (e.g. 2.5.9): pnpm add survey-*@2.5.9
 *   - Without: pnpm add survey-*@latest
 *
 * CLI version is untrusted. It is allowlisted (`latest` or semver.valid)
 * before any child-process argv is built. spawnSync uses an args array
 * and shell: false (CWE-78).
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import semver from "semver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SURVEY_PACKAGES = Object.freeze([
  "survey-core",
  "survey-creator-core",
  "survey-creator-react",
  "survey-react-ui",
  "survey-analytics",
]);

const PACKAGE_NAME_PATTERN = /^survey-[a-z0-9-]+$/;
const PNPM_BIN_NAMES = new Set(["pnpm", "pnpm.cmd"]);

function parseVersion(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const coerced = semver.coerce(versionStr);
  return coerced ? semver.valid(coerced) : null;
}

/** Only `latest` or a canonical semver string. Rejects everything else. */
function toValidSpec(versionArg) {
  if (versionArg == null || versionArg === "") {
    return "latest";
  }
  if (typeof versionArg !== "string") {
    throw new Error("Version must be a string.");
  }
  if (versionArg === "latest") {
    return "latest";
  }
  // Do not coerce: "2.5.9; rm" would become "2.5.9". Exact semver only.
  const parsed = semver.valid(versionArg);
  if (!parsed) {
    throw new Error(
      `Invalid version '${versionArg}'. Use a semver version (e.g. 2.5.9) or omit for latest.`,
    );
  }
  return parsed;
}

function assertSafePackageNames(packages) {
  for (const pkg of packages) {
    if (!PACKAGE_NAME_PATTERN.test(pkg) || !SURVEY_PACKAGES.includes(pkg)) {
      throw new Error(`Refusing to install unexpected package '${pkg}'.`);
    }
  }
}

function buildPnpmAddArgs(spec) {
  assertSafePackageNames(SURVEY_PACKAGES);
  if (spec !== "latest" && !semver.valid(spec)) {
    throw new Error(`Refusing to pass unvalidated specifier '${spec}'.`);
  }
  return ["add", ...SURVEY_PACKAGES.map((pkg) => `${pkg}@${spec}`)];
}

function assertSafePnpmPath(pnpmPath) {
  const resolved = path.resolve(pnpmPath);
  const base = path.basename(resolved);
  if (!PNPM_BIN_NAMES.has(base)) {
    throw new Error(`Refusing to execute unexpected binary '${base}'.`);
  }
  if (!existsSync(resolved)) {
    throw new Error(`pnpm not found at ${resolved}.`);
  }
  return resolved;
}

function getInstalledVersion(hubDir) {
  try {
    const pkgPath = path.join(hubDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const v = pkg.dependencies?.["survey-core"];
    return v ? parseVersion(v) : null;
  } catch {
    return null;
  }
}

function getPnpmPath(hubDir) {
  const name = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const candidates = [
    path.join(hubDir, "node_modules", ".bin", name),
    path.join(hubDir, "..", "node_modules", ".bin", name),
    path.join(path.dirname(process.execPath), name),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[2];
}

console.log("🚀 Upgrading Survey.js packages...\n");

const PROJECT_ROOT = process.cwd();
const hubDir = existsSync(path.join(PROJECT_ROOT, "package.json"))
  ? PROJECT_ROOT
  : path.resolve(__dirname, "..");
process.chdir(hubDir);

try {
  const spec = toValidSpec(process.argv[2]?.trim());
  const args = buildPnpmAddArgs(spec);
  const pnpmPath = assertSafePnpmPath(getPnpmPath(hubDir));

  console.log(`📦 Packages: ${SURVEY_PACKAGES.join(", ")}`);
  console.log(`📌 Specifier: ${spec}\n`);
  console.log(`⚡ Running: pnpm ${args.join(" ")}\n`);

  const result = spawnSync(pnpmPath, args, {
    stdio: "inherit",
    cwd: hubDir,
    shell: false,
    windowsHide: true,
  });

  if (result.status !== 0 || result.signal) {
    let msg;
    if (result.error) {
      msg = result.error.message;
    } else if (result.signal) {
      msg = `pnpm was killed by signal ${result.signal}`;
    } else {
      msg = `pnpm exited with code ${result.status}`;
    }

    throw new Error(msg);
  }

  const installed = getInstalledVersion(hubDir);
  console.log("\n✅ Survey.js packages upgraded successfully!");
  if (installed) {
    console.log("📋 Updated version: " + installed);
  } else {
    console.log("📋 Version could not be read from package.json");
  }

  console.log("\n📋 Next steps:");
  console.log("  1. Test your application to ensure everything works");
  console.log("  2. Check for any breaking changes in the Survey.js changelog");
  console.log("  3. Commit your changes if everything looks good");
} catch (error) {
  console.error("\n❌ Error upgrading Survey.js packages:");
  console.error(error.message);
  process.exit(1);
}
