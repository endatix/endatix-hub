#!/usr/bin/env node

import { execSync } from "child_process";
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

console.log("🚀 Upgrading Survey.js packages...\n");

try {
  // Change to the hub directory (parent of scripts)
  const hubDir = path.join(__dirname, "..");
  process.chdir(hubDir);

  console.log(`📁 Working directory: ${hubDir}`);
  console.log(`📦 Packages to upgrade: ${SURVEY_PACKAGES.join(", ")}\n`);

  // Execute the pnpm upgrade command
  const command = `pnpm up ${SURVEY_PACKAGES.join(" ")}`;
  console.log(`⚡ Running: ${command}\n`);

  execSync(command, {
    stdio: "inherit",
    cwd: hubDir,
  });

  console.log("\n✅ Survey.js packages upgraded successfully!");
  console.log("\n📋 Next steps:");
  console.log("  1. Test your application to ensure everything works");
  console.log("  2. Check for any breaking changes in the Survey.js changelog");
  console.log("  3. Commit your changes if everything looks good");
} catch (error) {
  console.error("\n❌ Error upgrading Survey.js packages:");
  console.error(error.message);
  process.exit(1);
}
