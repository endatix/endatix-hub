import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  describeNestedLinkedExternals,
  findNestedLinkedExternals,
} from "./lib/linked-externals.mjs";

// Runs as part of `pnpm build`, after `next build` (endatix-hub#1269): fails when Turbopack
// linked a nested copy into `.next/standalone/.next/node_modules`, which breaks on hosts
// that dereference symlinks on upload (Azure Static Web Apps). It needs no server, so
// every build path runs it, also those that skip check:dereferenced-standalone.

const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneDir = join(__dirname, "..", ".next/standalone");

if (!existsSync(standaloneDir)) {
  console.error(" \x1b[31m✗\x1b[0m .next/standalone not found — `next build` must run first");
  process.exit(1);
}

const nested = findNestedLinkedExternals(standaloneDir);
if (nested.length > 0) {
  console.error(` \x1b[31m✗\x1b[0m ${describeNestedLinkedExternals(nested)}`);
  process.exit(1);
}
console.log(" \x1b[32m✓\x1b[0m linked externals are top-level packages");
