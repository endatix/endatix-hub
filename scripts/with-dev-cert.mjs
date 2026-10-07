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

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");
const DEFAULT_PEM = path.join(homedir(), ".aspnet", "https", "aspnetapp.pem");
let bundleFile;

const [command, ...args] = process.argv.slice(2);
if (!command) {
  fail("Usage: node scripts/with-dev-cert.mjs <command> [args...] | --export");
}
if (command === "--export") {
  exportDevCertificate(
    process.env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM,
    certificateName(process.env),
  );
} else {
  runWithDevCert(command, args);
}

function runWithDevCert(name, rest) {
  // On Unix the child leads its own process group, so a SIGINT (terminal
  // Ctrl+C or a signal to this PID) reaches only this process. It is forwarded
  // once. A second SIGINT makes Playwright force-quit and skip cleanup.
  // Windows shares the console; detaching would open a second window.
  const child = spawn(process.execPath, [...resolveEntry(name), ...rest], {
    stdio: "inherit",
    env: withDevCertEnv(process.env),
    detached: process.platform !== "win32",
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });
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
  const relative = binPath(bin, pkg, name);
  return relative ? path.join(path.dirname(manifestPath), relative) : undefined;
}

/** A string `bin` is named after the package (without its scope). */
function binPath(bin, pkg, name) {
  if (typeof bin === "string") {
    return pkg.split("/").pop() === name ? bin : undefined;
  }
  return bin?.[name];
}

/**
 * Adds the dev certificate to NODE_EXTRA_CA_CERTS. Node accepts one file, so an
 * existing value (e.g. a corporate proxy CA) is kept by bundling both. A missing
 * certificate only warns: remote and http APIs need no trust.
 */
function withDevCertEnv(env) {
  const pem = env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM;
  const name = certificateName(env);
  if (!existsSync(pem)) {
    warn(
      `Dev certificate not found (${name}). https://localhost API calls will fail.`,
    );
    warn("Export it once: pnpm setup:dev");
    return env;
  }
  const certificate = readCertificate(pem, name);
  if (!certificate) {
    return env;
  }
  const existing = env.NODE_EXTRA_CA_CERTS;
  if (!existing || path.resolve(existing) === path.resolve(pem)) {
    return { ...env, NODE_EXTRA_CA_CERTS: pem };
  }
  return { ...env, NODE_EXTRA_CA_CERTS: bundle(existing, certificate) ?? pem };
}

/**
 * How messages name the certificate. A path set through ENDATIX_DEV_CERT_PATH
 * is named by the variable: environment values are not echoed to logs.
 */
function certificateName(env) {
  return env.ENDATIX_DEV_CERT_PATH ? "ENDATIX_DEV_CERT_PATH" : DEFAULT_PEM;
}

/** Returns the PEM text, or undefined with a warning when it is not usable. */
function readCertificate(pem, name) {
  let text;
  try {
    text = readFileSync(pem, "utf8");
  } catch {
    warn(`Dev certificate cannot be read (${name}). Check its permissions.`);
    return undefined;
  }
  if (text.includes("PRIVATE KEY")) {
    warn(
      `Dev certificate (${name}) contains a private key, so it is not used. Delete it and run: pnpm setup:dev`,
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
    warn(
      `Dev certificate (${name}) is not a PEM certificate. Export it again: pnpm setup:dev`,
    );
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
      "The NODE_EXTRA_CA_CERTS file cannot be read. Using the dev certificate only.",
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
function exportDevCertificate(pem, name) {
  const dotnet = findDotnet();
  if (!dotnet) {
    fail(
      "dotnet was not found. Install the .NET SDK, or set DOTNET_ROOT to its folder, then run: pnpm setup:dev",
    );
  }
  mkdirSync(path.dirname(pem), { recursive: true, mode: 0o700 });
  const exporter = spawn(
    dotnet,
    ["dev-certs", "https", "-ep", pem, "--format", "PEM"],
    { stdio: "inherit" },
  );
  exporter.on("error", (error) =>
    fail(`Could not run dotnet: ${error.message}`),
  );
  exporter.on("exit", (code) => {
    if (code === 0) {
      console.log(` \x1b[32m✓\x1b[0m Dev certificate exported (${name})`);
    }
    process.exit(code ?? 1);
  });
}

/**
 * The dotnet executable by absolute path, not looked up through PATH:
 * DOTNET_ROOT first, then the SDK installers' default folders.
 */
function findDotnet() {
  const executable = process.platform === "win32" ? "dotnet.exe" : "dotnet";
  const roots = [
    process.env.DOTNET_ROOT,
    ...(process.platform === "win32"
      ? [path.join(process.env.ProgramFiles ?? String.raw`C:\Program Files`, "dotnet")]
      : [
          "/usr/local/share/dotnet",
          "/usr/share/dotnet",
          "/usr/lib/dotnet",
          "/usr/lib64/dotnet",
          "/opt/homebrew/opt/dotnet/libexec",
          "/snap/dotnet-sdk/current",
        ]),
    path.join(homedir(), ".dotnet"),
  ].filter(Boolean);
  return roots
    .map((root) => path.join(root, executable))
    .find((candidate) => existsSync(candidate));
}

function warn(message) {
  console.warn(` \x1b[33m!\x1b[0m ${message}`);
}

function fail(message) {
  console.error(` \x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}
