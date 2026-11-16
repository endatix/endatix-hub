/**
 * One brand colour in, every primary-family Hub token out, for light and dark.
 *
 * Each token keeps its built-in relationship to the built-in primary (lightness,
 * chroma ratio, hue offset, all in OKLCH) and applies it to the brand colour.
 * So the built-in colour reproduces `app/globals.css`, and a branded Hub keeps
 * the same contrast steps. Every other hue-carrying token (`--info*`, the
 * `--sjs2-*` Creator mapping) follows `--primary` through `var()` already.
 */
import {
  contrastRatio,
  fromOklch,
  parseCssColor,
  toHex,
  toOklch,
  type Oklch,
  type Rgb,
} from "./color";

export interface BrandColor {
  readonly primary: Rgb;
  /** Null: derived from `primary`. */
  readonly onDark: Rgb | null;
}

export const BRAND_TOKENS = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--endatix",
  "--primary-dim",
  "--sidebar-ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const;

export type BrandToken = (typeof BRAND_TOKENS)[number];
export type BrandTokenValues = Readonly<Record<BrandToken, string>>;
export type ColorMode = "light" | "dark";

/** Built-in values, copied from `app/globals.css`. The derivation is relative to these. */
const REFERENCE: Record<
  ColorMode,
  Record<Exclude<BrandToken, "--ring" | "--endatix">, string>
> = {
  light: {
    "--primary": "hsl(216 100% 41%)",
    "--primary-foreground": "hsl(210 40% 98%)",
    "--primary-dim": "hsl(216 100% 37%)",
    "--sidebar-ring": "hsl(217.2 91.2% 59.8%)",
    "--chart-1": "hsl(211 100% 78%)",
    "--chart-2": "hsl(216 100% 58%)",
    "--chart-3": "hsl(221 97% 53%)",
    "--chart-4": "hsl(216 100% 41%)",
    "--chart-5": "hsl(227 76% 41%)",
  },
  dark: {
    "--primary": "#b4c5ff",
    "--primary-foreground": "#00389a",
    "--primary-dim": "#a0b6ff",
    "--sidebar-ring": "hsl(217.2 91.2% 59.8%)",
    "--chart-1": "hsl(211 100% 78%)",
    "--chart-2": "hsl(216 100% 58%)",
    "--chart-3": "hsl(221 97% 53%)",
    "--chart-4": "hsl(218 85% 60%)",
    "--chart-5": "hsl(227 76% 41%)",
  },
};

/** The page each mode's primary sits on (`--background`). */
const PAGE_BACKGROUND: Record<ColorMode, string> = {
  light: "hsl(0 0% 100%)",
  dark: "#000f21",
};

const TEXT_CONTRAST = 4.5;
/** WCAG 2.x 1.4.11: a control or focus ring against what is next to it. */
const UI_CONTRAST = 3;
const MAX_CHROMA_SCALE = 1.5;

const reference = (
  mode: ColorMode,
  token: keyof (typeof REFERENCE)["light"],
): Oklch => toOklch(parseCssColor(REFERENCE[mode][token])!);

export function derivePalette(
  color: BrandColor,
): Record<ColorMode, BrandTokenValues> {
  const light = brandHue("light", color.primary);
  const darkPrimary =
    color.onDark ?? fromOklch(follow(reference("dark", "--primary"), light));
  return {
    light: tokensFor("light", color.primary, light),
    dark: tokensFor("dark", darkPrimary, brandHue("dark", darkPrimary)),
  };
}

/** `html:root{…}html.dark{…}`: (0,1,1) beats globals.css `:root` / `.dark` in any order. */
export function toStylesheet(color: BrandColor | null): string {
  if (color === null) return "";
  const palette = derivePalette(color);
  const block = (values: BrandTokenValues) =>
    BRAND_TOKENS.map((token) => `${token}:${values[token]};`).join("");
  return `html:root{${block(palette.light)}}html.dark{${block(palette.dark)}}`;
}

export interface ContrastFinding {
  readonly mode: ColorMode;
  /** The pack field to change. */
  readonly token: "tokens.color.primary" | "tokens.color.primary-on-dark";
  readonly ratio: number;
  readonly minimum: number;
}

/**
 * The checks a pack can fail. The foreground always reaches 4.5:1 (derivation
 * picks it), so what is left is the primary against the page it sits on.
 */
export function checkBrandContrast(color: BrandColor): ContrastFinding[] {
  const palette = derivePalette(color);
  const findings: ContrastFinding[] = [];
  for (const mode of ["light", "dark"] as const) {
    const ratio = contrastRatio(
      parseCssColor(palette[mode]["--primary"])!,
      parseCssColor(PAGE_BACKGROUND[mode])!,
    );
    if (ratio < UI_CONTRAST) {
      const token =
        mode === "dark" && color.onDark
          ? "tokens.color.primary-on-dark"
          : "tokens.color.primary";
      findings.push({ mode, token, ratio: round(ratio), minimum: UI_CONTRAST });
    }
  }
  return findings;
}

function tokensFor(
  mode: ColorMode,
  primary: Rgb,
  hue: BrandHue,
): BrandTokenValues {
  const primaryHex = toHex(primary);
  return {
    "--primary": primaryHex,
    "--primary-foreground": foregroundFor(
      primary,
      follow(reference(mode, "--primary-foreground"), hue),
    ),
    "--ring": primaryHex,
    "--endatix": primaryHex,
    "--primary-dim": dimFor(mode, primary),
    ...followingTokens(mode, hue),
  } as BrandTokenValues;
}

function followingTokens(mode: ColorMode, hue: BrandHue) {
  return Object.fromEntries(
    FOLLOWING_TOKENS.map((token) => [
      token,
      toHex(fromOklch(follow(reference(mode, token), hue))),
    ]),
  );
}

/** Tokens that keep their built-in lightness and move with the brand's hue. */
const FOLLOWING_TOKENS = [
  "--sidebar-ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
] as const;

/** The built-in step from primary to dim, applied to this mode's primary. */
function dimFor(mode: ColorMode, primary: Rgb): string {
  const base = toOklch(primary);
  const from = reference(mode, "--primary");
  const to = reference(mode, "--primary-dim");
  const chromaRatio = from.c > 0 ? to.c / from.c : 1;
  return toHex(
    fromOklch({
      l: base.l + (to.l - from.l),
      c: base.c * chromaRatio,
      h: base.c > 1e-4 ? base.h + (to.h - from.h) : base.h,
    }),
  );
}

/**
 * The tinted built-in foreground when it reads, else white or black, whichever
 * reads better. Checked on the hex values the stylesheet will carry.
 */
function foregroundFor(primary: Rgb, tinted: Oklch): string {
  const candidate = toHex(fromOklch(tinted));
  const asWritten = (hex: string) => parseCssColor(hex)!;
  if (
    contrastRatio(asWritten(toHex(primary)), asWritten(candidate)) >=
    TEXT_CONTRAST
  )
    return candidate;
  const white: Rgb = { r: 1, g: 1, b: 1 };
  const black: Rgb = { r: 0, g: 0, b: 0 };
  return contrastRatio(primary, white) >= contrastRatio(primary, black)
    ? "#ffffff"
    : "#000000";
}

/** How far a mode's brand primary sits from that mode's built-in primary. */
interface BrandHue {
  /** Hue shift in degrees. */
  readonly shift: number;
  /** Chroma ratio, capped. */
  readonly scale: number;
}

function brandHue(mode: ColorMode, primary: Rgb): BrandHue {
  const { h, c } = toOklch(primary);
  const builtIn = reference(mode, "--primary");
  return {
    shift: h - builtIn.h,
    scale: Math.min(MAX_CHROMA_SCALE, c / builtIn.c),
  };
}

/** A reference token moved by the brand's hue shift, chroma scaled alike. */
function follow(token: Oklch, hue: BrandHue): Oklch {
  return {
    l: token.l,
    c: token.c * hue.scale,
    h: wrapHue(token.h + hue.shift),
  };
}

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
