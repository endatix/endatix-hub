#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
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

// Extract semver from lockfile version (e.g. "2.5.9" or "2.5.9(peer@1.0.0)")
function parseResolvedVersion(versionStr) {
  if (!versionStr || typeof versionStr !== "string") return null;
  const match = versionStr.match(/^(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function readPackageJson(hubDir) {
  const pkgPath = path.join(hubDir, "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf8"));
}

function writePackageJson(hubDir, pkg) {
  const pkgPath = path.join(hubDir, "package.json");
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

function setSurveyVersionsInPackageJson(hubDir, version) {
  const pkg = readPackageJson(hubDir);
  const range = `^${version}`;
  for (const name of SURVEY_PACKAGES) {
    if (pkg.dependencies && name in pkg.dependencies) {
      pkg.dependencies[name] = range;
    }
  }
  writePackageJson(hubDir, pkg);
}

function getResolvedVersionFromLockfile(hubDir) {
  const lockPath = path.join(hubDir, "pnpm-lock.yaml");
  const content = readFileSync(lockPath, "utf8");
  // Find survey-core entry under importers.:.dependencies
  const surveyCoreMatch = content.match(
    /survey-core:\s*\n\s*specifier:[^\n]+\n\s*version:\s*([^\n]+)/,
  );
  if (!surveyCoreMatch) return null;
  return parseResolvedVersion(surveyCoreMatch[1].trim());
}

console.log("🚀 Upgrading Survey.js packages...\n");

const hubDir = path.join(__dirname, "..");
process.chdir(hubDir);

const versionArg = process.argv[2]?.trim();

try {
  if (versionArg) {
    const version = parseResolvedVersion(versionArg) || versionArg;
    console.log(`📌 Target version: ${version}`);
    console.log(`📦 Packages: ${SURVEY_PACKAGES.join(", ")}\n`);
    setSurveyVersionsInPackageJson(hubDir, version);
    console.log(`⚡ Running: pnpm install\n`);
    execSync("pnpm install", { stdio: "inherit", cwd: hubDir });
    console.log("\n✅ Survey.js packages set to ^" + version);
    console.log("📋 Updated version: " + version);
  } else {
    console.log(`📦 Packages to upgrade: ${SURVEY_PACKAGES.join(", ")}\n`);
    const command = `pnpm up ${SURVEY_PACKAGES.join(" ")}`;
    console.log(`⚡ Running: ${command}\n`);
    execSync(command, { stdio: "inherit", cwd: hubDir });
    const resolved = getResolvedVersionFromLockfile(hubDir);
    if (resolved) {
      setSurveyVersionsInPackageJson(hubDir, resolved);
      console.log("\n✅ Survey.js packages upgraded successfully!");
      console.log(
        "📋 Updated version: " +
          resolved +
          " (package.json aligned with lockfile)",
      );
      // Ensure lockfile is consistent after package.json edit
      execSync("pnpm install", { stdio: "inherit", cwd: hubDir });
    } else {
      console.log("\n✅ Survey.js packages upgraded successfully!");
      console.log(
        "📋 Resolved version could not be read from lockfile; check pnpm list.",
      );
    }
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
