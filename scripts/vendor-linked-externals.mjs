import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vendorLinkedExternals } from "./lib/linked-externals.mjs";

// Runs after `next build` (endatix-hub#1269): gives each external that Turbopack links
// into `.next/standalone/.next/node_modules` its own copies of the dependency versions
// it resolves from its real path, so hosts that dereference symlinks on upload (Azure
// Static Web Apps) load the same code. scripts/check-dereferenced-standalone.mjs checks it.

const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneDir = join(__dirname, "..", ".next/standalone");

if (!existsSync(standaloneDir)) {
  console.error(
    " \x1b[31m✗\x1b[0m .next/standalone not found — `next build` must run first",
  );
  process.exit(1);
}

const copies = vendorLinkedExternals(standaloneDir);
for (const { owner, name, expectedVersion } of copies) {
  console.log(` \x1b[32m✓\x1b[0m ${owner}: vendored ${name}@${expectedVersion}`);
}
if (copies.length === 0) {
  console.log(" \x1b[32m✓\x1b[0m linked externals need no vendored dependencies");
}
