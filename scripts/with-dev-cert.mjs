// Runs a Node CLI with the local .NET HTTPS dev certificate trusted, so Hub dev
// and e2e reach https://localhost:5001 without NODE_TLS_REJECT_UNAUTHORIZED=0.
//
//   node scripts/with-dev-cert.mjs next dev
//   node scripts/with-dev-cert.mjs playwright test --grep "Screen-out"
//   node scripts/with-dev-cert.mjs --export   (pnpm setup:dev: export the PEM once)
//
// NODE_EXTRA_CA_CERTS is read only when Node starts, so it is set here for the
// child, not in .env. Commands run as `node <bin entry>` (no shell), so args are
// passed as-is on Windows, macOS and Linux.

import { spawn } from "node:child_process";
import { X509Certificate } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");
const DEFAULT_PEM = path.join(homedir(), ".aspnet", "https", "aspnetapp.pem");
let bundleFile;

// Runs only as a CLI; `scripts/dev.mjs` imports runWithDevCert instead.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    fail(
      "Usage: node scripts/with-dev-cert.mjs <command> [args...] | --export",
    );
  }
  if (command === "--export") {
    exportDevCertificate(process.env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM);
  } else {
    runWithDevCert(command, args);
  }
}

/** Starts `name` (node or a Hub dependency bin) with the dev certificate trusted. */
export function runWithDevCert(name, rest) {
  const child = spawn(process.execPath, [...resolveEntry(name), ...rest], {
    stdio: "inherit",
    env: withDevCertEnv(process.env),
  });

  // Ctrl+C already reaches the child through the terminal; a second SIGINT makes
  // Playwright force-quit and skip cleanup. So SIGINT only keeps this process
  // alive until the child exits. Signals sent to this process alone are forwarded.
  process.on("SIGINT", () => {});
  const forwarded =
    process.platform === "win32"
      ? ["SIGTERM", "SIGBREAK"]
      : ["SIGTERM", "SIGHUP"];
  for (const signal of forwarded) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) =>
    fail(`Could not start "${name}": ${error.message}`),
  );
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
  process.on("exit", removeBundle);
}

/** `node` runs as itself; any other command is a bin of a direct Hub dependency. */
function resolveEntry(name) {
  if (name === "node") {
    return [];
  }
  const manifest = JSON.parse(
    readFileSync(path.join(hubRoot, "package.json"), "utf8"),
  );
  const packages = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  });
  for (const pkg of packages) {
    const entry = binEntry(pkg, name);
    if (entry) {
      return [entry];
    }
  }
  fail(
    `"${name}" is not a bin of a Hub dependency. Run it through pnpm instead.`,
  );
}

function binEntry(pkg, name) {
  let manifestPath;
  try {
    manifestPath = require.resolve(`${pkg}/package.json`, { paths: [hubRoot] });
  } catch {
    return undefined;
  }
  const { bin } = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relative =
    typeof bin === "string"
      ? pkg.split("/").pop() === name
        ? bin
        : undefined
      : bin?.[name];
  return relative ? path.join(path.dirname(manifestPath), relative) : undefined;
}

/**
 * Adds the dev certificate to NODE_EXTRA_CA_CERTS. Node accepts one file, so an
 * existing value (e.g. a corporate proxy CA) is kept by bundling both. A missing
 * certificate only warns: remote and http APIs need no trust.
 */
function withDevCertEnv(env) {
  const pem = env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM;
  if (!existsSync(pem)) {
    warn(
      `Dev certificate not found at ${pem}. https://localhost API calls will fail.`,
    );
    warn("Export it once: pnpm setup:dev");
    return env;
  }
  const certificate = readCertificate(pem);
  if (!certificate) {
    return env;
  }
  const existing = env.NODE_EXTRA_CA_CERTS;
  if (!existing || path.resolve(existing) === path.resolve(pem)) {
    ok("dev certificate trusted", pem);
    return { ...env, NODE_EXTRA_CA_CERTS: pem };
  }
  const bundled = bundle(existing, certificate);
  ok("dev certificate trusted", bundled ? `${pem} + ${existing}` : pem);
  return { ...env, NODE_EXTRA_CA_CERTS: bundled ?? pem };
}

/** Returns the PEM text, or undefined with a warning when it is not usable. */
function readCertificate(pem) {
  const text = readFileSync(pem, "utf8");
  if (text.includes("PRIVATE KEY")) {
    warn(
      `${pem} contains a private key, so it is not used. Delete it and run: pnpm setup:dev`,
    );
    return undefined;
  }
  try {
    const validTo = new Date(new X509Certificate(text).validTo);
    if (validTo < new Date()) {
      warn(
        `Dev certificate expired on ${validTo.toISOString().slice(0, 10)}. Run: dotnet dev-certs https --trust, then pnpm setup:dev.`,
      );
    }
  } catch {
    warn(`${pem} is not a PEM certificate. Export it again: pnpm setup:dev`);
    return undefined;
  }
  return text;
}

/** Writes both certificates to a temp file, removed when this process exits. */
function bundle(existing, certificate) {
  let existingText;
  try {
    existingText = readFileSync(existing, "utf8");
  } catch {
    warn(
      `NODE_EXTRA_CA_CERTS points to ${existing}, which cannot be read. Using the dev certificate only.`,
    );
    return undefined;
  }
  bundleFile = path.join(tmpdir(), `endatix-hub-ca-bundle-${process.pid}.pem`);
  writeFileSync(bundleFile, `${existingText.trimEnd()}\n${certificate}`, {
    mode: 0o600,
  });
  return bundleFile;
}

function removeBundle() {
  if (bundleFile) {
    rmSync(bundleFile, { force: true });
  }
}

/**
 * Exports the public dev certificate (no private key: no -p). dotnet does not
 * create the folder, so it is created here, readable by the current user only.
 */
function exportDevCertificate(pem) {
  mkdirSync(path.dirname(pem), { recursive: true, mode: 0o700 });
  const exporter = spawn(
    "dotnet",
    ["dev-certs", "https", "-ep", pem, "--format", "PEM"],
    {
      stdio: "inherit",
    },
  );
  exporter.on("error", () =>
    fail(
      "dotnet was not found. Install the .NET SDK, then run: pnpm setup:dev",
    ),
  );
  exporter.on("exit", (code) => {
    if (code === 0) {
      console.log(` \x1b[32m✓\x1b[0m Dev certificate exported to ${pem}`);
    }
    process.exit(code ?? 1);
  });
}

function ok(label, detail) {
  console.log(` \x1b[32m✓\x1b[0m ${label} \x1b[2m(${detail})\x1b[0m`);
}

function warn(message) {
  console.warn(` \x1b[33m!\x1b[0m ${message}`);
}

function fail(message) {
  console.error(` \x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}
