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
 * - Version spec is validated (semver-like or "latest") so we never pass
 *   shell metacharacters into the child process.
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Survey packages to upgrade
const SURVEY_PACKAGES = [
  "survey-core",
  "survey-creator-core",
  "survey-creator-react",
  "survey-react-ui",
];

// Extract semver from a range (e.g. "^2.5.9" -> "2.5.9")
function parseVersion(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const match = String(versionStr).match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
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

console.log("🚀 Upgrading Survey.js packages...\n");

const hubDir = path.join(__dirname, "..");
process.chdir(hubDir);

const versionArg = process.argv[2]?.trim();
// Use @version if provided, otherwise @latest; same code path. Restrict to semver-like or "latest" to satisfy static security checks.
const rawSpec = versionArg ? parseVersion(versionArg) || versionArg : "latest";
const spec =
  rawSpec === "latest" || /^[\d.]+(-[\w.]+)?$/.test(rawSpec)
    ? rawSpec
    : "latest";
// Build args as array (no shell) so static tools don't flag command injection
const args = ["add", ...SURVEY_PACKAGES.map((p) => `${p}@${spec}`)];

try {
  console.log(`📦 Packages: ${SURVEY_PACKAGES.join(", ")}`);
  console.log(`📌 Specifier: ${spec}\n`);
  console.log(`⚡ Running: pnpm ${args.join(" ")}\n`);

  const result = spawnSync("pnpm", args, {
    stdio: "inherit",
    cwd: hubDir,
    shell: false,
  });

  // status is null when the process was killed by a signal (e.g. SIGINT)
  if (result.status !== 0 || result.signal) {
    const msg = result.error
      ? result.error.message
      : result.signal
      ? `pnpm was killed by signal ${result.signal}`
      : `pnpm exited with code ${result.status}`;
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
