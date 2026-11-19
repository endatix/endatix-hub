import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, parseCssColor, type Rgb } from "../color";
import { FOCUS_SURFACES, type ColorMode } from "../palette";
import { builtInToken, HUB_ROOT } from "./globals-css";

/**
 * Every built-in keyboard focus ring that names a colour token
 * (`focus-visible:ring-destructive/70`, `dark:focus-visible:ring-ring`)
 * reaches 3:1 on every surface in `FOCUS_SURFACES` (WCAG 1.4.11). The
 * `--focus-ring` token itself is checked in palette.test.ts.
 */

const SOURCE_DIRS = ["app", "components", "features", "lib"];
const FOCUS_RING_CLASS =
  /(?<![\w-])((?:[\w-]+:)*)focus-visible:ring-([a-z][a-z-]*)(?:\/(\d+))?(?![\w/[-])/g;
const NOT_A_COLOUR = new Set(["focus-ring", "inset"]);

interface FocusRing {
  site: string;
  mode: ColorMode;
  token: string;
  opacity: number;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return ["node_modules", "__tests__"].includes(entry.name)
        ? []
        : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)
      ? [full]
      : [];
  });
}

type RingClass = Omit<FocusRing, "mode">;

/**
 * The focus ring each line draws in each mode. A `dark:` class replaces the
 * unprefixed one with the same other variants (`aria-invalid:` and so on).
 */
function ringsOnLine(site: string, line: string): FocusRing[] {
  const byVariants = new Map<string, { base?: RingClass; dark?: RingClass }>();
  for (const [, variants, token, opacity] of line.matchAll(FOCUS_RING_CLASS)) {
    if (NOT_A_COLOUR.has(token) || token.startsWith("offset")) continue;
    const key = variants.replace(/(^|:)dark:/, "$1");
    const slot = key === variants ? "base" : "dark";
    const ring = { site, token, opacity: opacity ? Number(opacity) / 100 : 1 };
    byVariants.set(key, { ...byVariants.get(key), [slot]: ring });
  }
  return [...byVariants.values()].flatMap(({ base, dark = base }) => {
    const rings: FocusRing[] = [];
    if (base) rings.push({ ...base, mode: "light" });
    if (dark) rings.push({ ...dark, mode: "dark" });
    return rings;
  });
}

function builtInFocusRings(): FocusRing[] {
  return SOURCE_DIRS.flatMap((dir) =>
    sourceFiles(path.join(HUB_ROOT, dir)),
  ).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, index) =>
        ringsOnLine(`${path.relative(HUB_ROOT, file)}:${index + 1}`, line),
      ),
  );
}

function over(color: Rgb, backdrop: Rgb, opacity: number): Rgb {
  const mix = (a: number, b: number) => a * opacity + b * (1 - opacity);
  return {
    r: mix(color.r, backdrop.r),
    g: mix(color.g, backdrop.g),
    b: mix(color.b, backdrop.b),
  };
}

function lowestContrast({ mode, token, opacity }: FocusRing): number {
  const value = builtInToken(mode === "light" ? ":root" : ".dark", token);
  const color = value ? parseCssColor(value) : null;
  if (!color)
    throw new Error(`--${token} has no ${mode} colour in globals.css`);
  return Math.min(
    ...FOCUS_SURFACES[mode].map((surface) => {
      const backdrop = parseCssColor(surface)!;
      return contrastRatio(over(color, backdrop, opacity), backdrop);
    }),
  );
}

describe("built-in focus rings that name a colour token", () => {
  const rings = builtInFocusRings();

  it("are found in the source", () => {
    // Assert
    expect(rings.length).toBeGreaterThan(0);
  });

  it.each(rings.map((ring) => [ring.site, ring.mode, ring] as const))(
    "%s reaches 3:1 on every %s surface",
    (_site, _mode, ring) => {
      // Act
      const ratio = lowestContrast(ring);

      // Assert
      expect(
        ratio,
        `${ring.mode} ring-${ring.token}/${Math.round(ring.opacity * 100)}`,
      ).toBeGreaterThanOrEqual(3);
    },
  );
});
