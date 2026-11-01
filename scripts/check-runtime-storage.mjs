import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withStandaloneServer } from "./lib/standalone-server.mjs";

// Smoke check for the published image (endatix-hub#1134): the image is built with no
// storage env and configured at runtime, so the standalone server must pick up
// STORAGE_* from its own process env. Next inlines every `nextConfig.env` key at
// build, so one storage key there freezes the provider for every deployment.
//
// Requires an existing `pnpm build` (output: "standalone"). Run it with no STORAGE_*
// set at build, as CI and the release image do.

const __dirname = dirname(fileURLToPath(import.meta.url));
const hubRoot = join(__dirname, "..");
const serverFile = join(hubRoot, ".next/standalone/server.js");

const SETTLE_MS = 3_000;

// Any of these in the build's env means storage was resolved at build time.
const FROZEN_ENV_KEY = /STORAGE|S3|AZURE|ENDATIX_RESOLVED/;
// Stripped from the inherited env so only the runtime values below configure storage.
const INHERITED_STORAGE_KEY = /STORAGE|^S3_|AZURE/;

const RUNTIME_ENV = {
  NODE_ENV: "production",
  HOSTNAME: "127.0.0.1",
  SESSION_SECRET: "check-runtime-storage-session-secret-0000000000",
  AUTH_SECRET: "check-runtime-storage-auth-secret-000000000000",
  ENDATIX_BASE_URL: "http://127.0.0.1:5001",
  STORAGE_PROVIDER: "s3",
  // Nothing listens here; startup only validates the settings, it does not connect.
  STORAGE_S3_ENDPOINT: "http://127.0.0.1:9",
  STORAGE_S3_ACCESS_KEY_ID: "check-runtime-storage",
  STORAGE_S3_SECRET_ACCESS_KEY: "check-runtime-storage",
  STORAGE_S3_REGION: "us-east-1",
};

const FAILURE_LINES = [
  "Storage service is not enabled",
  "Failed to prepare server",
];
// Printed by lib/hosting/check-environment.ts, so its absence means the check never ran.
const STARTUP_CHECK_LINE = /Environment validation (passed|failed)/;

function fail(message) {
  console.error(` \x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}

async function checkBuildEnv() {
  const manifestPath = join(hubRoot, ".next/required-server-files.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  } catch {
    fail(".next/required-server-files.json not found — run `pnpm build` first");
  }

  const frozen = Object.keys(manifest.config?.env ?? {}).filter((key) =>
    FROZEN_ENV_KEY.test(key),
  );
  if (frozen.length > 0) {
    fail(
      `nextConfig.env inlines storage keys at build: ${frozen.join(", ")}. ` +
        "Read storage from process.env at runtime instead.",
    );
  }
  console.log(" \x1b[32m✓\x1b[0m build env holds no storage keys");
}

function runtimeEnv() {
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !INHERITED_STORAGE_KEY.test(key),
    ),
  );
  return { ...inherited, ...RUNTIME_ENV };
}

async function checkRuntimeStartup() {
  const { output, error } = await withStandaloneServer(
    serverFile,
    runtimeEnv(),
    async (port) => {
      // One request, so instrumentation and lazily loaded server code run.
      await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" }).catch(
        () => undefined,
      );
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    },
  );

  if (error !== undefined) {
    console.error(output);
    fail(error.message);
  }

  const failure = FAILURE_LINES.find((line) => output.includes(line));
  if (failure !== undefined || !STARTUP_CHECK_LINE.test(output)) {
    console.error(output);
    fail(
      failure !== undefined
        ? `standalone server logged "${failure}" with STORAGE_PROVIDER=s3 set at runtime`
        : "standalone server never ran its environment check",
    );
  }
  console.log(
    " \x1b[32m✓\x1b[0m standalone server enables storage from runtime env",
  );
}

await checkBuildEnv();
await checkRuntimeStartup();
console.log("PASS");
