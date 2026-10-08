// The `pnpm dev` banner, laid out like the Endatix wordmark: the icon
// (public/assets/icons/icon.svg as 8 x 8 pixel art: the blue square with the
// white paperclip) with the product name and build beside it. Printed only in
// a colour terminal; CI and piped logs get no banner.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { styleText } from "node:util";

const hubRoot = path.resolve(import.meta.dirname, "..");

// B blue, W white, . terminal background (the rounded corners). Drawn with
// half blocks (two square pixels per character, each with its own colour), so
// rows meet without the gaps Braille dots leave.
const ICON = [
  ".BBBBBB.",
  "BBBBWWBB",
  "BBBWBBWB",
  "BBWBBBWB",
  "BWBBBWBB",
  "BWBBWBBB",
  "BBWWBBBB",
  ".BBBBBB.",
];
const ICON_ROWS = ICON.length / 2;
const TITLE_ROW = 1;
const TITLE = "Endatix Hub";
const BRAND = [0, 84, 209]; // #0054D1
const WHITE = [255, 255, 255];
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
  if (depth < 4) {
    // A two-tone icon needs colour (NO_COLOR, TERM=dumb): title only.
    out.write(`${styleText("bold", TITLE)}  ${build}\n\n`);
    return;
  }
  const colour = colourCodes(depth);
  const draw = (sweep) =>
    iconRows(colour, sweep).map((logo, row) => {
      if (row !== TITLE_ROW) {
        return `  ${logo}`;
      }
      const name = paintTitle(colour, sweep);
      return `  ${logo}  ${styleText("bold", name)}  ${build}`;
    });

  out.write(`${draw(null).join("\n")}\n\n`);
  if (depth < 24) {
    return;
  }
  for (let frame = 0; frame <= FRAMES; frame++) {
    await sleep(FRAME_MS);
    const sweep = frame === FRAMES ? null : frame / (FRAMES - 1);
    // Back to the icon's first row, redraw, then return below the blank line.
    out.write(`\x1b[${ICON_ROWS + 1}A\r${draw(sweep).join("\n")}\n\n`);
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

/** Two pixels per character: ▀ with the top as text colour and the bottom as background. */
function iconRows(colour, sweep) {
  const rows = [];
  for (let y = 0; y < ICON.length; y += 2) {
    const cells = [...ICON[y]].map((top, x) => {
      const bottom = ICON[y + 1][x];
      const at = (pixel) => pixelColour(pixel, x / SPAN, sweep);
      if (top === "." && bottom === ".") {
        return " ";
      }
      if (top === ".") {
        return colour.paint("▄", at(bottom));
      }
      if (bottom === ".") {
        return colour.paint("▀", at(top));
      }
      return colour.paint("▀", at(top), at(bottom));
    });
    rows.push(cells.join(""));
  }
  return rows;
}

/** White stays white; blue takes the sweep while it passes. */
function pixelColour(pixel, position, sweep) {
  return pixel === "W" ? WHITE : colourAt(position, sweep);
}

const SPAN = ICON[0].length + 2 + TITLE.length;

function paintTitle(colour, sweep) {
  const offset = ICON[0].length + 2;
  return [...TITLE]
    .map((char, i) =>
      char === " "
        ? char
        : colour.paint(char, colourAt((offset + i) / SPAN, sweep)),
    )
    .join("");
}

/**
 * Escape codes for 24-bit colour, else the nearest of 256 or 16 colours (brand
 * blue 26 / 34, white 15 / 97). The sweep runs only in 24-bit colour.
 */
function colourCodes(depth) {
  const fg = (rgb) => {
    if (depth >= 24) {
      return `38;2;${rgb.join(";")}`;
    }
    const white = rgb === WHITE;
    if (depth >= 8) {
      return white ? "38;5;15" : "38;5;26";
    }
    return white ? "97" : "34";
  };
  const bg = (rgb) => {
    if (depth >= 24) {
      return `48;2;${rgb.join(";")}`;
    }
    const white = rgb === WHITE;
    if (depth >= 8) {
      return white ? "48;5;15" : "48;5;26";
    }
    return white ? "107" : "44";
  };
  return {
    paint: (glyph, top, bottom) => {
      const codes = bottom ? `${fg(top)};${bg(bottom)}` : fg(top);
      return `\x1b[${codes}m${glyph}\x1b[0m`;
    },
  };
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
