import { access, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hubRoot = join(__dirname, "..");

// `output: "standalone"` emits a minimal server bundle but deliberately leaves
// out static assets, so they have to be copied in alongside it.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/output
//
// Destinations are spelled out in full on purpose: `cp -r src dest/` appends the
// source basename when `dest` already exists as a directory, but fs.cp never
// does. Shortening `to` to the parent directory would silently misplace the
// assets — the build still succeeds and the served site loses its styles.
const assets = [
  { from: ".next/static", to: ".next/standalone/.next/static" },
  { from: "public", to: ".next/standalone/public" },
];

for (const { from, to } of assets) {
  const source = join(hubRoot, from);

  try {
    await access(source);
  } catch {
    console.error(
      ` \x1b[31m✗\x1b[0m ${from} not found — run \`pnpm build\` first`,
    );
    process.exit(1);
  }

  await cp(source, join(hubRoot, to), { recursive: true });
  console.log(` \x1b[32m✓\x1b[0m ${from} → ${to}`);
}
