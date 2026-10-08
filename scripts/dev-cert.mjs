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
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { constants, homedir, tmpdir } from "node:os";
import path from "node:path";
import { styleText } from "node:util";

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");
const DEFAULT_PEM = path.join(homedir(), ".aspnet", "https", "aspnetapp.pem");
const IS_WINDOWS = process.platform === "win32";
// The commands package scripts run, mapped to the package that ships the bin.
const BIN_PACKAGES = { next: "next", playwright: "@playwright/test" };
let bundleDir;

/** Starts `name` (node, next or playwright) with the dev certificate trusted. */
export function runWithDevCert(name, rest) {
  const child = spawn(process.execPath, [...resolveEntry(name), ...rest], {
    stdio: "inherit",
    env: withDevCertEnv(process.env),
    // Unix: the child leads its own process group, so terminal Ctrl+C reaches
    // only this process and is forwarded exactly once per press. A second press
    // then force-quits Playwright, as the user intends. Windows shares the
    // console instead (detaching would open a second window).
    detached: !IS_WINDOWS,
  });
  forwardSignals(child);
  child.on("error", (error) =>
    fail(`Could not start "${name}": ${error.message}`),
  );
  child.on("exit", (code, signal) => exitLike(code, signal));
  // If this process ends first (an error or a crash it can handle), do not
  // leave a detached child running. A SIGKILL to this PID cannot be handled.
  process.on("exit", () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
    removeBundle();
  });
}

/**
 * Unix forwards SIGINT, SIGTERM and SIGHUP. On Windows the console already
 * delivers Ctrl+C and Ctrl+Break to the child, and child.kill() with any signal
 * terminates it at once, so only SIGTERM is forwarded and the others just keep
 * this process alive until the child exits.
 */
function forwardSignals(child) {
  const forwarded = IS_WINDOWS ? ["SIGTERM"] : ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const signal of forwarded) {
    process.on(signal, () => child.kill(signal));
  }
  if (IS_WINDOWS) {
    process.on("SIGINT", () => {});
    process.on("SIGBREAK", () => {});
  }
}

/** Exits with the child's code, or ends by the child's signal so callers see an interrupt. */
function exitLike(code, signal) {
  if (code !== null) {
    process.exit(code);
  }
  removeBundle();
  process.removeAllListeners(signal);
  process.kill(process.pid, signal);
  // Not reached where the signal ends the process; 128 + n is the shell convention.
  process.exit(128 + (constants.signals[signal] ?? 0));
}

/** `node` runs as itself; `next` and `playwright` run their package's bin file. */
function resolveEntry(name) {
  if (name === "node") {
    return [];
  }
  const pkg = BIN_PACKAGES[name];
  if (!pkg) {
    fail(
      `"${name}" is not supported. Use node, ${Object.keys(BIN_PACKAGES).join(" or ")}.`,
    );
  }
  const manifestPath = require.resolve(`${pkg}/package.json`, {
    paths: [hubRoot],
  });
  const { bin } = JSON.parse(readFileSync(manifestPath, "utf8"));
  const relative = typeof bin === "string" ? bin : bin?.[name];
  if (!relative) {
    fail(`${pkg} has no "${name}" bin. Run: pnpm install`);
  }
  return [path.join(path.dirname(manifestPath), relative)];
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
  const bundled =
    existing && path.resolve(existing) !== path.resolve(pem)
      ? bundle(existing, certificate.text)
      : undefined;
  if (!certificate.expired) {
    ok(
      "dev certificate trusted",
      bundled ? [name, "with NODE_EXTRA_CA_CERTS"] : [name],
    );
  }
  return { ...env, NODE_EXTRA_CA_CERTS: bundled ?? pem };
}

/**
 * How messages name the certificate. A path set through ENDATIX_DEV_CERT_PATH
 * is named by the variable: environment values are not echoed to logs.
 */
function certificateName(env) {
  return env.ENDATIX_DEV_CERT_PATH ? "ENDATIX_DEV_CERT_PATH" : DEFAULT_PEM;
}

/**
 * Returns the PEM text, or undefined with a warning when it is not usable. An
 * expired certificate is still used (the API may serve it) but is not reported
 * as trusted.
 */
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
  let validTo;
  try {
    validTo = new Date(new X509Certificate(text).validTo);
  } catch {
    warn(
      `Dev certificate (${name}) is not a PEM certificate. Export it again: pnpm setup:dev`,
    );
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
      "The NODE_EXTRA_CA_CERTS file cannot be read. Using the dev certificate only.",
    );
    return undefined;
  }
  // A fresh private folder (0700) and an exclusive create: another user cannot
  // pre-create or swap the file to add a CA of their own.
  bundleDir = mkdtempSync(path.join(tmpdir(), "endatix-hub-ca-"));
  const file = path.join(bundleDir, "bundle.pem");
  writeFileSync(file, `${existingText.trimEnd()}\n${certificate}`, {
    mode: 0o600,
    flag: "wx",
  });
  return file;
}

function removeBundle() {
  if (bundleDir) {
    rmSync(bundleDir, { recursive: true, force: true });
    bundleDir = undefined;
  }
}

/**
 * Exports the public dev certificate (no private key: no -p). dotnet does not
 * create the folder, so it is created here, readable by the current user only.
 * An existing file named by ENDATIX_DEV_CERT_PATH is not replaced: it may be
 * another machine's certificate (the Windows file seen from WSL).
 */
export function exportDevCertificate(env) {
  const pem = env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM;
  const name = certificateName(env);
  if (env.ENDATIX_DEV_CERT_PATH && existsSync(pem)) {
    fail(
      "ENDATIX_DEV_CERT_PATH names an existing certificate, so it is not replaced. Unset it to export this machine's certificate.",
    );
  }
  const dotnet = findDotnet();
  if (!dotnet) {
    fail(
      "dotnet SDK not found. Install it, or set DOTNET_ROOT to its folder, then run: pnpm setup:dev",
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
      ok("dev certificate exported", [name]);
    }
    process.exit(code ?? 1);
  });
}

/**
 * The dotnet executable by absolute path, not looked up through PATH:
 * DOTNET_ROOT first, then the SDK installers' default folders. A folder counts
 * only with an `sdk` subfolder: a runtime-only install has no `dev-certs`.
 */
function findDotnet() {
  const executable = IS_WINDOWS ? "dotnet.exe" : "dotnet";
  const roots = [
    process.env.DOTNET_ROOT,
    ...(IS_WINDOWS
      ? [
          path.join(
            process.env.ProgramFiles ?? String.raw`C:\Program Files`,
            "dotnet",
          ),
        ]
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
  const sdkRoot = roots.find(
    (root) =>
      existsSync(path.join(root, executable)) &&
      existsSync(path.join(root, "sdk")),
  );
  return sdkRoot ? path.join(sdkRoot, executable) : undefined;
}

// styleText drops colors when the stream is not a terminal or NO_COLOR is set.
const STDERR = { stream: process.stderr };

/**
 * A status line, then each detail on its own muted line (paths are long). Details
 * are the default path or a variable name, never an environment value.
 */
function ok(label, details) {
  console.log(` ${styleText("green", "✓")} ${label}`);
  for (const detail of details) {
    console.log(`   ${styleText("dim", displayPath(detail))}`);
  }
}

/** Shortens the home folder to `~` on macOS and Linux; Windows shells do not expand it. */
function displayPath(file) {
  const home = homedir();
  const underHome = !IS_WINDOWS && file.startsWith(home + path.sep);
  return underHome ? `~${file.slice(home.length)}` : file;
}

export function warn(message) {
  console.warn(` ${styleText("yellow", "!", STDERR)} ${message}`);
}

export function fail(message) {
  console.error(` ${styleText("red", "✗", STDERR)} ${message}`);
  process.exit(1);
}
