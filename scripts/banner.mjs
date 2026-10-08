// The `pnpm dev` banner: the Endatix paperclip (public/assets/icons/icon.svg)
// as half-block pixel art, with the Hub, Next.js and Node versions beside it.
// Printed only in a terminal; CI and piped logs get no banner.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { styleText } from "node:util";

const require = createRequire(import.meta.url);
const hubRoot = path.resolve(import.meta.dirname, "..");

// 10 x 10 pixels, two per character row: an outer loop and the inner wire on
// 45-degree strokes, which stay crisp at this size.
const LOGO = [
  "......###.",
  ".....#...#",
  "....#..#.#",
  "...#..#..#",
  "..#..#..#.",
  ".#..#..#..",
  "#..#..#...",
  "#.#..#....",
  "#...#.....",
  ".###......",
];
const BRAND = [0, 84, 209]; // #0054D1
const HIGHLIGHT = [120, 175, 255];
const FRAMES = 8;
const FRAME_MS = 40;

/**
 * Prints the banner and, in a colour terminal, sweeps a highlight across the
 * clip once (about 300 ms; run it alongside other startup work).
 */
export async function printBanner() {
  const out = process.stdout;
  if (!out.isTTY || process.env.CI) {
    return;
  }
  const paint = colourPainter(out);
  const text = headerLines();
  const draw = (sweep) =>
    halfBlockRows(LOGO).map((cells, row) => {
      const logo = cells
        .map(({ glyph, diagonal }) =>
          glyph === " " ? " " : paint(glyph, glow(diagonal, sweep)),
        )
        .join("");
      return `  ${logo}   ${text[row] ?? ""}`.trimEnd();
    });

  const rows = draw(null);
  out.write(`${rows.join("\n")}\n\n`);
  if (!paint.animates) {
    return;
  }
  for (let frame = 0; frame <= FRAMES; frame++) {
    await sleep(FRAME_MS);
    const sweep = frame === FRAMES ? null : frame / (FRAMES - 1);
    // Back to the first logo row, redraw it, then return below the blank line.
    out.write(`\x1b[${rows.length + 1}A\r${draw(sweep).join("\n")}\n\n`);
  }
}

/** Version lines beside the logo, top row left empty to centre them. */
function headerLines() {
  const hub = readVersion(path.join(hubRoot, "package.json"));
  const next = readVersion(
    require.resolve("next/package.json", { paths: [hubRoot] }),
  );
  const hubVersion = `v${hub}`;
  const title = `${styleText("bold", "Endatix Hub")} ${styleText("dim", hubVersion)}`;
  const versions = `Next.js ${next} · Node ${process.version}`;
  return [
    "",
    title,
    styleText("dim", versions),
    styleText("dim", shortPath(hubRoot)),
  ];
}

function readVersion(manifest) {
  try {
    return JSON.parse(readFileSync(manifest, "utf8")).version ?? "?";
  } catch {
    return "?";
  }
}

function shortPath(dir) {
  const home = homedir();
  return process.platform !== "win32" && dir.startsWith(home + path.sep)
    ? `~${dir.slice(home.length)}`
    : dir;
}

/** Two pixel rows per character: ▀ top, ▄ bottom, █ both. */
function halfBlockRows(pixels) {
  const rows = [];
  for (let y = 0; y < pixels.length; y += 2) {
    const top = pixels[y];
    const bottom = pixels[y + 1] ?? ".".repeat(top.length);
    rows.push(
      [...top].map((pixel, x) => {
        const on = [pixel === "#", bottom[x] === "#"];
        const glyph = on[0] ? (on[1] ? "█" : "▀") : on[1] ? "▄" : " ";
        return { glyph, diagonal: (x + y) / (top.length + pixels.length) };
      }),
    );
  }
  return rows;
}

/** 0..1: how strongly a cell glows while the sweep passes its diagonal. */
function glow(diagonal, sweep) {
  if (sweep === null) {
    return 0;
  }
  return Math.max(0, 1 - Math.abs(diagonal - sweep) * 5);
}

/**
 * Colours by what the terminal supports (Node's hasColors honours NO_COLOR and
 * FORCE_COLOR). Only 24-bit colour animates; fewer colours print the plain logo.
 */
function colourPainter(out) {
  const depth = out.getColorDepth?.() ?? 1;
  let paint;
  if (depth >= 24) {
    paint = (glyph, amount) => {
      const [r, g, b] = BRAND.map((c, i) =>
        Math.round(c + (HIGHLIGHT[i] - c) * amount),
      );
      return `\x1b[38;2;${r};${g};${b}m${glyph}\x1b[0m`;
    };
  } else if (depth >= 8) {
    paint = (glyph) => `\x1b[38;5;26m${glyph}\x1b[0m`;
  } else if (depth >= 4) {
    paint = (glyph) => `\x1b[34m${glyph}\x1b[0m`;
  } else {
    paint = (glyph) => glyph;
  }
  paint.animates = depth >= 24;
  return paint;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
