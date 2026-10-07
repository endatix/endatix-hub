// Trusts the local .NET HTTPS dev certificate for a child Node process, so Hub
// dev and e2e reach https://localhost:5001 without NODE_TLS_REJECT_UNAUTHORIZED=0.
// NODE_EXTRA_CA_CERTS is read only when Node starts, so it is set for the child,
// not in .env. Commands run as `node <bin entry>` (no shell), so args are passed
// as-is on Windows, macOS and Linux. CLI: with-dev-cert.mjs. Used by dev.mjs.

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
import { styleText } from "node:util";

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");
const DEFAULT_PEM = path.join(homedir(), ".aspnet", "https", "aspnetapp.pem");

/** The dev certificate file: `ENDATIX_DEV_CERT_PATH`, else the .NET default. */
export function devCertPath(env = process.env) {
  return env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM;
}
let bundleFile;

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
  const pem = devCertPath(env);
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
  const bundled =
    existing && path.resolve(existing) !== path.resolve(pem)
      ? bundle(existing, certificate.text)
      : undefined;
  if (!certificate.expired) {
    ok("dev certificate trusted", bundled ? [pem, existing] : [pem]);
  }
  return { ...env, NODE_EXTRA_CA_CERTS: bundled ?? pem };
}

/**
 * Returns the PEM text, or undefined with a warning when it is not usable. An
 * expired certificate is still used (the API may serve it) but is not reported
 * as trusted.
 */
function readCertificate(pem) {
  const text = readFileSync(pem, "utf8");
  if (text.includes("PRIVATE KEY")) {
    warn(
      `${pem} contains a private key, so it is not used. Delete it and run: pnpm setup:dev`,
    );
    return undefined;
  }
  let validTo;
  try {
    validTo = new Date(new X509Certificate(text).validTo);
  } catch {
    warn(`${pem} is not a PEM certificate. Export it again: pnpm setup:dev`);
    return undefined;
  }
  const expired = validTo < new Date();
  if (expired) {
    warn(
      `Dev certificate expired on ${validTo.toISOString().slice(0, 10)}. Run: dotnet dev-certs https --trust, then pnpm setup:dev.`,
    );
  }
  return { text, expired };
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
export function exportDevCertificate(pem) {
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
      ok("dev certificate exported", [pem]);
    }
    process.exit(code ?? 1);
  });
}

/** A status line, then each file on its own muted line (paths are long). */
// styleText drops colors when the stream is not a terminal or NO_COLOR is set.
const STDERR = { stream: process.stderr };

/** A status line, then each file on its own muted line (paths are long). */
function ok(label, files) {
  console.log(` ${styleText("green", "✓")} ${label}`);
  for (const file of files) {
    console.log(`   ${styleText("dim", displayPath(file))}`);
  }
}

/** Shortens the home folder to `~` on macOS and Linux; Windows shells do not expand it. */
function displayPath(file) {
  const home = homedir();
  const underHome =
    process.platform !== "win32" && file.startsWith(home + path.sep);
  return underHome ? `~${file.slice(home.length)}` : file;
}

export function warn(message) {
  console.warn(` ${styleText("yellow", "!", STDERR)} ${message}`);
}

export function fail(message) {
  console.error(` ${styleText("red", "✗", STDERR)} ${message}`);
  process.exit(1);
}
