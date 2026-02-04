#!/usr/bin/env node

import { execSync } from "child_process";
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
  const pkgPath = path.join(hubDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const v = pkg.dependencies?.["survey-core"];
  return v ? parseVersion(v) : null;
}

console.log("🚀 Upgrading Survey.js packages...\n");

const hubDir = path.join(__dirname, "..");
process.chdir(hubDir);

const versionArg = process.argv[2]?.trim();
// Use @version if provided, otherwise @latest; same code path
const spec = versionArg ? parseVersion(versionArg) || versionArg : "latest";
const packagesWithSpec = SURVEY_PACKAGES.map((p) => `${p}@${spec}`).join(" ");

try {
  console.log(`📦 Packages: ${SURVEY_PACKAGES.join(", ")}`);
  console.log(`📌 Specifier: ${spec}\n`);
  const command = `pnpm add ${packagesWithSpec}`;
  console.log(`⚡ Running: ${command}\n`);

  execSync(command, { stdio: "inherit", cwd: hubDir });

  const installed = getInstalledVersion(hubDir);
  console.log("\n✅ Survey.js packages upgraded successfully!");
  if (installed) {
    console.log("📋 Updated version: " + installed);
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
