#!/usr/bin/env node

/**
 * Upgrade Survey.js packages in hub/package.json.
 * Usage: node upgrade-surveyjs.mjs [version]
 *   - With version (e.g. 2.5.9): pnpm add survey-*@2.5.9
 *   - Without: pnpm add survey-*@latest
 *
 * Security (for static analysis / learning):
 * - spawnSync(..., { shell: false }) avoids command injection: args are passed
 *   as an array, so the shell never interprets user input. See CWE-78, OWASP
 *   "Command Injection".
 * - Version spec is validated (semver or "latest") so we never pass
 *   shell metacharacters into the child process.
 * - Version parsing/validation uses the semver package (no custom regexes),
 *   avoiding ReDoS (S5852) and matching npm semver behavior.
 * - Executable is resolved to a fixed path (hub node_modules/.bin/pnpm) so
 *   we do not rely on PATH, which may contain user-writable directories.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import semver from "semver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Survey packages to upgrade
const SURVEY_PACKAGES = [
  "survey-core",
  "survey-creator-core",
  "survey-creator-react",
  "survey-react-ui",
];

// Extract a valid semver string from a range or tag (e.g. "^2.5.9" or "v2.5.9" -> "2.5.9"). Uses semver package to avoid ReDoS.
function parseVersion(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const coerced = semver.coerce(versionStr);
  return coerced ? semver.valid(coerced) : null;
}

// Allow only "latest" or a valid semver string; otherwise default to "latest".
function toValidSpec(versionArg) {
  const raw = versionArg ? parseVersion(versionArg) || versionArg : "latest";
  if (raw === "latest") {
    return raw;
  }
  return semver.valid(raw) ? raw : "latest";
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

// Fixed path to pnpm so we do not rely on PATH (may contain user-writable dirs).
// Try: hub node_modules, parent node_modules, then same directory as Node (corepack/global).
function getPnpmPath(hubDir) {
  const name = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const inHub = path.join(hubDir, "node_modules", ".bin", name);
  if (existsSync(inHub)) return inHub;
  const inParent = path.join(hubDir, "..", "node_modules", ".bin", name);
  if (existsSync(inParent)) return inParent;
  const nextToNode = path.join(path.dirname(process.execPath), name);
  if (existsSync(nextToNode)) return nextToNode;
  return nextToNode;
}

console.log("🚀 Upgrading Survey.js packages...\n");

const PROJECT_ROOT = process.cwd();
const hubDir = existsSync(path.join(PROJECT_ROOT, "package.json"))
  ? PROJECT_ROOT
  : path.resolve(__dirname, "..");
process.chdir(hubDir);

const versionArg = process.argv[2]?.trim();
const spec = toValidSpec(versionArg);
// Build args as array (no shell) so static tools don't flag command injection
const args = ["add", ...SURVEY_PACKAGES.map((p) => `${p}@${spec}`)];

const pnpmPath = getPnpmPath(hubDir);
if (!existsSync(pnpmPath)) {
  console.error(
    `\n❌ pnpm not found. Tried: hub/node_modules/.bin, parent node_modules/.bin, and Node bin dir (${path.dirname(
      process.execPath,
    )}).\n` +
      `  Run "pnpm install" from the hub directory, or enable corepack: corepack enable\n`,
  );
  process.exit(1);
}

try {
  console.log(`📦 Packages: ${SURVEY_PACKAGES.join(", ")}`);
  console.log(`📌 Specifier: ${spec}\n`);
  console.log(`⚡ Running: pnpm ${args.join(" ")}\n`);

  const result = spawnSync(pnpmPath, args, {
    stdio: "inherit",
    cwd: hubDir,
    shell: false,
  });

  // status is null when the process was killed by a signal (e.g. SIGINT)
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
