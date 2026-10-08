// The `pnpm dev` banner, laid out like the Endatix wordmark: the icon from
// public/assets/icons/icon.svg as 16 x 16 Braille dots, with the product name
// in bold and the build, muted, below it. Printed only in a terminal; CI and piped
// logs get no banner.

import { styleText } from "node:util";
import { resolveHubBuild } from "../lib/hosting/hub-build.mjs";

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
const SWEEP_MS = 600;
const FRAME_MS = 30;
const FRAMES = Math.round(SWEEP_MS / FRAME_MS);

/**
 * Prints the banner. In a 24-bit colour terminal a synthwave gradient sweeps
 * across the icon and title once (about 600 ms, eased at both ends; run it
 * alongside other work) and settles on brand blue. Each frame redraws the
 * banner by moving the cursor up, so nothing else may print until it ends:
 * `next dev` starts after it, and a longer sweep is a slower startup.
 */
export async function printBanner() {
  const out = process.stdout;
  if (!out.isTTY || process.env.CI) {
    return;
  }
  const build = styleText("dim", formatBuild(hubBuildIdentity()));
  if (!terminalDrawsBraille()) {
    out.write(`  ${styleText("bold", TITLE)}\n  ${build}\n\n`);
    return;
  }
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
    const sweep = frame === FRAMES ? null : easeInOut(frame / (FRAMES - 1));
    // Back to the first logo row, clear and redraw each line, then return
    // below the blank line.
    const lines = draw(sweep).map((line) => `\x1b[2K${line}`);
    out.write(`\x1b[${ICON.length + 1}A\r${lines.join("\n")}\n\n`);
  }
}

/**
 * Same resolver as the About dialog (`resolveHubBuild`).
 * @param {(args: string[]) => string} [git]
 * @param {import("../lib/hosting/hub-build.mjs").ReleaseEnv} [env]
 */
export function hubBuildIdentity(git, env = process.env) {
  return resolveHubBuild(git, env);
}

/**
 * Braille is one cell wide in Windows Terminal, VS Code, macOS and Linux.
 * The legacy Windows console draws it at the wrong width, so the wordmark
 * would shove the title. That console gets the name and build only.
 */
function terminalDrawsBraille(env = process.env) {
  if (process.platform !== "win32") {
    return true;
  }
  return Boolean(env.WT_SESSION) || env.TERM_PROGRAM === "vscode";
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

/** Slow at the start and end, fastest through the middle. */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
