// Runs a Node CLI with the local .NET HTTPS dev certificate trusted, so Hub dev
// and e2e reach https://localhost:5001 without NODE_TLS_REJECT_UNAUTHORIZED=0.
//
//   node scripts/with-dev-cert.mjs next dev
//   node scripts/with-dev-cert.mjs playwright test --grep "Screen-out"
//   node scripts/with-dev-cert.mjs --export   (pnpm setup:dev: export it again)
//
// A missing certificate is exported on first use when a .NET SDK is found, the
// way `next dev --experimental-https` creates its own certificate on demand.
//
// NODE_EXTRA_CA_CERTS is read only when Node starts, so it is set here for the
// child, not in .env. Commands run as `node <bin entry>` (no shell), so args are
// passed as-is on Windows, macOS and Linux.

import { spawn, spawnSync } from "node:child_process";
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
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");
const DEFAULT_PEM = path.join(homedir(), ".aspnet", "https", "aspnetapp.pem");
const IS_WINDOWS = process.platform === "win32";
// The commands package scripts run, mapped to the package that ships the bin.
const BIN_PACKAGES = { next: "next", playwright: "@playwright/test" };
let bundleDir;

const [command, ...args] = process.argv.slice(2);
if (!command) {
  fail("Usage: node scripts/with-dev-cert.mjs <command> [args...] | --export");
}
if (command === "--export") {
  process.exit(exportDevCertificate(process.env) ? 0 : 1);
} else {
  await runWithDevCert(command, args);
}

async function runWithDevCert(name, rest) {
  // The child stays in this process's group, so the terminal's Ctrl+C, Ctrl+\,
  // Ctrl+Z, SIGHUP on close and SIGWINCH reach the whole tree (Next's forked
  // server included), as they do without the wrapper.
  const env = withDevCertEnv(process.env);
  const args = [
    ...rest,
    ...(await nextHttpsArgs(name, rest, env.NODE_EXTRA_CA_CERTS)),
  ];
  const child = spawn(process.execPath, [...resolveEntry(name), ...args], {
    stdio: "inherit",
    env,
  });
  forwardSignals(child);
  child.on("error", (error) =>
    fail(`Could not start "${name}": ${error.message}`),
  );
  child.on("exit", (code, signal) => exitLike(code, signal));
  // If this process ends first (an error or a crash it can handle), stop the
  // child too. A SIGKILL to this PID cannot be handled.
  process.on("exit", () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
    }
    removeBundle();
  });
}

/**
 * SIGTERM, which a process manager or IDE sends to this PID alone, is
 * forwarded. SIGINT is forwarded only without a terminal: in a terminal the
 * child already gets Ctrl+C from the tty (and pnpm forwards one more), so a
 * forwarded copy would be a duplicate. On Windows the console delivers Ctrl+C
 * and Ctrl+Break itself, and child.kill() with any signal terminates at once.
 * Handlers that do not forward keep this process alive until the child exits.
 */
function forwardSignals(child) {
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  const forwardSigint = !IS_WINDOWS && !process.stdin.isTTY;
  process.on("SIGINT", () => {
    if (forwardSigint) {
      child.kill("SIGINT");
    }
  });
  if (IS_WINDOWS) {
    process.on("SIGBREAK", () => {});
  }
}

/**
 * `next dev --experimental-https` replaces NODE_EXTRA_CA_CERTS for its server
 * with mkcert's root CA, which would drop the dev certificate. So the wrapper
 * asks Next's own mkcert helper for the certificate (created or reused exactly
 * as `next dev` would) and passes it with a CA bundle of mkcert's root and what
 * this process trusts.
 */
async function nextHttpsArgs(name, rest, trustedCa) {
  const wantsHttps = name === "next" && rest.includes("--experimental-https");
  const choseFiles = rest.some((arg) =>
    arg.startsWith("--experimental-https-"),
  );
  if (!wantsHttps || choseFiles || !trustedCa) {
    return [];
  }
  const certificate = await nextSelfSignedCertificate(hostnameArg(rest));
  if (!certificate?.rootCA) {
    warn(
      "Next's HTTPS certificate helper is unavailable, so the dev server does not trust the dev certificate.",
    );
    return [];
  }
  const caBundle = writeBundle("next-https-ca.pem", [
    readFileSync(certificate.rootCA, "utf8"),
    readFileSync(trustedCa, "utf8"),
  ]);
  return [
    "--experimental-https-key",
    certificate.key,
    "--experimental-https-cert",
    certificate.cert,
    "--experimental-https-ca",
    caBundle,
  ];
}

/**
 * Next's internal `createSelfSignedCertificate` (next/dist/lib/mkcert). Not a
 * public API: if a Next upgrade moves it, dev-https falls back to Next's own
 * handling and only the warning above appears.
 */
async function nextSelfSignedCertificate(host) {
  try {
    const helper = require.resolve("next/dist/lib/mkcert.js", {
      paths: [hubRoot],
    });
    const { createSelfSignedCertificate } = await import(pathToFileURL(helper));
    return await createSelfSignedCertificate(host);
  } catch {
    return undefined;
  }
}

/** The `-H` / `--hostname` value Next gives mkcert, if any. */
function hostnameArg(rest) {
  const index = rest.findIndex((arg) => arg === "-H" || arg === "--hostname");
  return index === -1 ? undefined : rest[index + 1];
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
  if (!existsSync(pem) && !exportOnFirstUse(env)) {
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
  warnAboutKeyFile(pem, name);
  try {
    const validTo = new Date(new X509Certificate(text).validTo);
    if (validTo < new Date()) {
      warn(expiredMessage(validTo, name));
    }
  } catch {
    warn(
      `Dev certificate (${name}) is not a PEM certificate. Export it again: pnpm setup:dev`,
    );
    return undefined;
  }
  return text;
}

/**
 * `dotnet dev-certs https -ep x.pem --format PEM --no-password` writes the
 * private key next to the certificate as `x.key`. Nothing here needs it.
 */
function warnAboutKeyFile(pem, name) {
  const keyFile = path.join(
    path.dirname(pem),
    `${path.basename(pem, path.extname(pem))}.key`,
  );
  if (existsSync(keyFile)) {
    warn(
      `A private key file sits next to the dev certificate (${name}, .key). Nothing needs it; delete it.`,
    );
  }
}

function expiredMessage(validTo, name) {
  const date = validTo.toISOString().slice(0, 10);
  return name === DEFAULT_PEM
    ? `Dev certificate expired on ${date}. Run: dotnet dev-certs https --trust, then pnpm setup:dev`
    : `Dev certificate (${name}) expired on ${date}. Export it again where it came from, or unset ENDATIX_DEV_CERT_PATH and run: pnpm setup:dev`;
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
  return writeBundle("ca-bundle.pem", [existingText, certificate]);
}

/**
 * Writes certificates into one file in a private folder (0700, created once)
 * with an exclusive create, so another user cannot pre-create or swap it to
 * add a CA of their own. Removed when this process exits.
 */
function writeBundle(fileName, pemTexts) {
  bundleDir ??= mkdtempSync(path.join(tmpdir(), "endatix-hub-ca-"));
  const file = path.join(bundleDir, fileName);
  const content = pemTexts.map((text) => text.trimEnd()).join("\n");
  writeFileSync(file, `${content}\n`, { mode: 0o600, flag: "wx" });
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
function exportDevCertificate(env) {
  const pem = env.ENDATIX_DEV_CERT_PATH || DEFAULT_PEM;
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
  return runExport(dotnet, pem, certificateName(env));
}

/**
 * A missing certificate is exported on first use when a .NET SDK is found.
 * Without an SDK (a remote or http API), or when the caller trusts its own CA
 * (the SaaS AppHost) or names its own file, nothing is exported and nothing is
 * printed.
 */
function exportOnFirstUse(env) {
  if (env.NODE_EXTRA_CA_CERTS || env.ENDATIX_DEV_CERT_PATH) {
    return false;
  }
  const dotnet = findDotnet();
  return dotnet ? runExport(dotnet, DEFAULT_PEM, DEFAULT_PEM) : false;
}

function runExport(dotnet, pem, name) {
  mkdirSync(path.dirname(pem), { recursive: true, mode: 0o700 });
  const { status, error } = spawnSync(
    dotnet,
    ["dev-certs", "https", "-ep", pem, "--format", "PEM"],
    { stdio: "inherit" },
  );
  if (status === 0) {
    console.log(` \x1b[32m✓\x1b[0m Dev certificate exported (${name})`);
    return true;
  }
  warn(
    `Could not export the dev certificate: ${error?.message ?? `dotnet exited ${status}`}`,
  );
  return false;
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
          // dotnet-install.ps1 default
          process.env.LOCALAPPDATA &&
            path.join(process.env.LOCALAPPDATA, "Microsoft", "dotnet"),
        ]
      : [
          "/usr/local/share/dotnet",
          "/usr/share/dotnet",
          "/usr/lib/dotnet",
          "/usr/lib64/dotnet",
          "/opt/homebrew/opt/dotnet/libexec", // Homebrew, Apple silicon
          "/usr/local/opt/dotnet/libexec", // Homebrew, Intel
          "/home/linuxbrew/.linuxbrew/opt/dotnet/libexec",
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

function warn(message) {
  console.warn(` \x1b[33m!\x1b[0m ${message}`);
}

function fail(message) {
  console.error(` \x1b[31m✗\x1b[0m ${message}`);
  process.exit(1);
}
