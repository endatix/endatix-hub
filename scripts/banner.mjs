// The `pnpm dev` banner, laid out like the Endatix wordmark: the icon from
// public/assets/icons/icon.svg as 16 x 16 Braille dots, with the product name
// in bold and the build, muted, below it. Printed only in a terminal; CI and piped
// logs get no banner.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

const hubRoot = path.resolve(import.meta.dirname, "..");

// The blue square with the paperclip cut out (8 x 4 characters). Four rows
// centre the two text lines and keep both loops of the clip visible.
const ICON = ["⣾⣿⣿⡿⠿⢿⣿⣷", "⣿⡿⢋⠔⣩⢇⣿⣿", "⣿⡇⢏⣘⡵⢋⣼⣿", "⢿⣿⣶⣤⣶⣿⣿⡿"];
const TITLE_ROW = 1;
const BUILD_ROW = 2;
const TITLE = "Endatix Hub";
const BRAND = [0, 84, 209]; // #0054D1
// Synthwave sweep: hot pink, purple, cyan.
const SWEEP = [
  [255, 42, 109],
  [185, 103, 255],
  [5, 217, 232],
];
const FRAMES = 12;
const FRAME_MS = 35;

/**
 * Prints the banner. In a 24-bit colour terminal a synthwave gradient sweeps
 * across the icon and title once (about 400 ms; run it alongside other work)
 * and settles on brand blue.
 */
export async function printBanner() {
  const out = process.stdout;
  if (!out.isTTY || process.env.CI) {
    return;
  }
  const build = styleText("dim", formatBuild(hubBuildIdentity()));
  const depth = out.getColorDepth?.() ?? 1;
  const draw = (sweep) =>
    ICON.map((line, row) => {
      const logo = paint(line.padEnd(ICON_WIDTH), 0, depth, sweep);
      if (row === TITLE_ROW) {
        const name = paint(TITLE, ICON_WIDTH + 2, depth, sweep);
        return `  ${logo}  ${styleText("bold", name)}`;
      }
      if (row === BUILD_ROW) {
        return `  ${logo}  ${build}`;
      }
      return `  ${logo}`.trimEnd();
    });

  out.write(`${draw(null).join("\n")}\n\n`);
  if (depth < 24) {
    return;
  }
  for (let frame = 0; frame <= FRAMES; frame++) {
    await sleep(FRAME_MS);
    const sweep = frame === FRAMES ? null : frame / (FRAMES - 1);
    // Back to the first logo row, clear and redraw each line, then return
    // below the blank line.
    const lines = draw(sweep).map((line) => `\x1b[2K${line}`);
    out.write(`\x1b[${ICON.length + 1}A\r${lines.join("\n")}\n\n`);
  }
}

/**
 * The same rules as lib/hosting/hub-version.ts `resolveHubBuild`, which this
 * plain-Node script cannot import (TypeScript, extensionless imports):
 * - version: a stamped package.json version (not `0.0.0-*`), else on a release
 *   line (`main`, `hotfix/*`, a tag checkout) the `v*` tag HEAD sits exactly on;
 * - branch: only when there is no version; commit: HEAD.
 * `__tests__/dev-banner.test.ts` pins the two against each other.
 *
 * @param {(args: string[]) => string} [git]
 * @param {string} [packageVersion]
 * @param {{ GITHUB_REF_TYPE?: string; GITHUB_HEAD_REF?: string; GITHUB_REF_NAME?: string }} [env]
 */
export function hubBuildIdentity(
  git = runGit,
  packageVersion = readPackageVersion(),
  env = process.env,
) {
  const branch = resolveBranch(git, env);
  const stamped = packageVersion.startsWith("0.0.0") ? null : packageVersion;
  const version =
    stamped ?? (isReleaseLine(branch) ? releaseTagAtHead(git) : null);
  const commit = tryGit(git, ["rev-parse", "HEAD"]);
  return { version, branch: version ? null : branch, commit };
}

/** `v0.8.0`, or `branch @ short commit`. */
export function formatBuild({ version, branch, commit }) {
  if (version) {
    return `v${version}`;
  }
  if (!branch && !commit) {
    return "local build";
  }
  return `${branch ?? "unknown branch"} @ ${commit?.slice(0, 7) ?? "unknown"}`;
}

function resolveBranch(git, env) {
  const branch = tryGit(git, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch && branch !== "HEAD") {
    return branch;
  }
  if (env.GITHUB_REF_TYPE === "tag") {
    return null;
  }
  return blankToNull(env.GITHUB_HEAD_REF) ?? blankToNull(env.GITHUB_REF_NAME);
}

function isReleaseLine(branch) {
  return branch === null || branch === "main" || branch.startsWith("hotfix/");
}

function releaseTagAtHead(git) {
  const tag = tryGit(git, [
    "describe",
    "--tags",
    "--exact-match",
    "--match",
    "v[0-9]*",
  ]);
  return tag ? tag.replace(/^v/, "") : null;
}

function tryGit(git, args) {
  try {
    return blankToNull(git(args));
  } catch {
    return null;
  }
}

function blankToNull(value) {
  return value?.trim() || null;
}

// Fixed paths, as in hub-version.ts: no PATH lookup (Sonar S4036).
const GIT_EXECUTABLES = [
  "/usr/bin/git",
  "/usr/local/bin/git",
  "/opt/homebrew/bin/git",
  String.raw`C:\Program Files\Git\cmd\git.exe`,
];

function runGit(args) {
  const git = GIT_EXECUTABLES.find((candidate) => existsSync(candidate));
  if (!git) {
    throw new Error("git is not installed in a known location");
  }
  return execFileSync(git, args, {
    cwd: hubRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function readPackageVersion() {
  try {
    const manifest = path.join(hubRoot, "package.json");
    return JSON.parse(readFileSync(manifest, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const ICON_WIDTH = Math.max(...ICON.map((line) => line.length));
const SPAN = ICON_WIDTH + 2 + TITLE.length;

/**
 * Colours each character of `text`, which starts at column `offset`: brand blue
 * (the nearest of 256 or 16 colours below 24-bit), the synthwave band while the
 * sweep passes, plain text without colour (NO_COLOR, TERM=dumb).
 */
function paint(text, offset, depth, sweep) {
  if (depth < 4) {
    return text;
  }
  return [...text]
    .map((char, i) => {
      if (char === " ") {
        return char;
      }
      if (depth < 24) {
        const code = depth >= 8 ? "38;5;26" : "34";
        return `\x1b[${code}m${char}\x1b[39m`;
      }
      const rgb = colourAt((offset + i) / SPAN, sweep).join(";");
      return `\x1b[38;2;${rgb}m${char}\x1b[39m`;
    })
    .join("");
}

/** Brand blue, or the synthwave band while the sweep passes this column. */
function colourAt(position, sweep) {
  if (sweep === null) {
    return BRAND;
  }
  const distance = position - sweep * 1.4 + 0.2;
  if (distance < 0 || distance > 0.4) {
    return BRAND;
  }
  const t = distance / 0.4; // 0..1 across the band
  const [from, to] = t < 0.5 ? [SWEEP[0], SWEEP[1]] : [SWEEP[1], SWEEP[2]];
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return from.map((c, i) => Math.round(c + (to[i] - c) * local));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
