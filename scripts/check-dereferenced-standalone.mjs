import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withStandaloneServer } from "./lib/standalone-server.mjs";

// Smoke check for Azure Static Web Apps (endatix-hub#1269): SWA dereferences symlinks
// when it uploads a hybrid Next.js app. Turbopack loads nested externals (sanitize-html's
// own postcss) through `.next/node_modules/<name>-<hash>` symlinks; once a link is a plain
// folder, the package resolves its dependencies from the top-level node_modules, and
// every server route answers 500 if tracing left them out there.
//
// Requires an existing `pnpm build` (output: "standalone"). Copies the standalone folder
// the way SWA does, starts it, and renders the sign-in page.

const __dirname = dirname(fileURLToPath(import.meta.url));
const standaloneDir = join(__dirname, "..", ".next/standalone");

const RUNTIME_ENV = {
  NODE_ENV: "production",
  HOSTNAME: "127.0.0.1",
  SESSION_SECRET: "check-dereferenced-standalone-session-secret-00000",
  AUTH_SECRET: "check-dereferenced-standalone-auth-secret-0000000",
  // Nothing listens here; the sign-in page renders without calling the API.
  ENDATIX_BASE_URL: "http://127.0.0.1:9",
};

const PAGE = "/signin";
const FAILURE_LINES = ["Failed to load external module", "Cannot find module"];

function fail(message) {
  console.error(` \x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

async function copyDereferenced() {
  const copyDir = await mkdtemp(join(tmpdir(), "hub-standalone-"));
  try {
    await cp(standaloneDir, copyDir, { recursive: true, dereference: true });
  } catch {
    await rm(copyDir, { recursive: true, force: true });
    fail(".next/standalone not found — run `pnpm build` first");
  }
  return copyDir;
}

async function renderPage(port) {
  const response = await fetch(`http://127.0.0.1:${port}${PAGE}`, {
    redirect: "manual",
  });
  if (response.status !== 200) {
    throw new Error(`GET ${PAGE} answered ${response.status}`);
  }
}

const copyDir = await copyDereferenced();
const { output, error } = await withStandaloneServer(
  join(copyDir, "server.js"),
  { ...process.env, ...RUNTIME_ENV },
  renderPage,
);
await rm(copyDir, { recursive: true, force: true });

const failure = FAILURE_LINES.find((line) => output.includes(line));
if (error !== undefined || failure !== undefined) {
  console.error(output);
  fail(
    error?.message ??
      `standalone server logged "${failure}" with symlinks dereferenced`,
  );
}
console.log(
  ` \x1b[32m✓\x1b[0m standalone server renders ${PAGE} with symlinks dereferenced`,
);
console.log("PASS");
