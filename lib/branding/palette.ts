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
  relativeLuminance,
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
  "--focus-ring",
  "--primary-hover",
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
  Record<
    Exclude<
      BrandToken,
      "--ring" | "--focus-ring" | "--primary-hover" | "--endatix"
    >,
    string
  >
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

/**
 * Where a focused control can sit in each mode, page first: `--background`,
 * `--content-canvas`, `--card` / `--popover` and `--sidebar` in app/globals.css.
 * A focus ring has to read on all of them.
 */
export const FOCUS_SURFACES: Record<ColorMode, readonly string[]> = {
  light: ["hsl(0 0% 100%)", "hsl(214 88% 97%)", "hsl(0 0% 98%)"],
  dark: ["#000f21", "#001225", "#001a34"],
};

const WHITE: Rgb = { r: 1, g: 1, b: 1 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

const TEXT_CONTRAST = 4.5;
/** WCAG 2.x 1.4.11: a control or focus ring against what is next to it. */
const UI_CONTRAST = 3;
const MAX_CHROMA_SCALE = 1.5;
/** The built-in states: `hover:bg-primary/90` and `focus-visible:ring-ring/50`. */
const HOVER_OPACITY = 0.9;
const RING_OPACITY = 0.5;
/** OKLCH lightness per step when a state has to move to reach its minimum. */
const LIGHTNESS_STEP = 0.01;

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
  return (["light", "dark"] as const).flatMap((mode) => {
    const ratio = contrastRatio(
      parseCssColor(palette[mode]["--primary"])!,
      parseCssColor(PAGE_BACKGROUND[mode])!,
    );
    if (ratio >= UI_CONTRAST) return [];
    const token: ContrastFinding["token"] =
      mode === "dark" && color.onDark
        ? "tokens.color.primary-on-dark"
        : "tokens.color.primary";
    return [{ mode, token, ratio: floorTo2(ratio), minimum: UI_CONTRAST }];
  });
}

function tokensFor(
  mode: ColorMode,
  primary: Rgb,
  hue: BrandHue,
): BrandTokenValues {
  const primaryHex = toHex(primary);
  const foreground = foregroundFor(mode, primary, hue);
  return {
    "--primary": primaryHex,
    "--primary-foreground": foreground,
    "--ring": primaryHex,
    "--focus-ring": focusRingFor(mode, primary),
    "--primary-hover": hoverFor(mode, primary, foreground),
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
function foregroundFor(mode: ColorMode, primary: Rgb, hue: BrandHue): string {
  const tinted = follow(reference(mode, "--primary-foreground"), hue);
  const candidate = toHex(fromOklch(tinted));
  const asWritten = (hex: string) => parseCssColor(hex)!;
  if (
    contrastRatio(asWritten(toHex(primary)), asWritten(candidate)) >=
    TEXT_CONTRAST
  )
    return candidate;
  return contrastRatio(primary, WHITE) >= contrastRatio(primary, BLACK)
    ? "#ffffff"
    : "#000000";
}

/**
 * The built-in hover, primary at 90% over the page, when the label still reads
 * on it at 4.5:1. Otherwise the same lightness step taken the other way, away
 * from the label, so the hover stays visible and reads better than the rest
 * colour. The primary itself always reads, so the search ends there at worst.
 */
function hoverFor(mode: ColorMode, primary: Rgb, foreground: string): string {
  const page = parseCssColor(PAGE_BACKGROUND[mode])!;
  const label = parseCssColor(foreground)!;
  const blend = over(primary, page, HOVER_OPACITY);
  const blendHex = toHex(blend);
  if (contrastRatio(parseCssColor(blendHex)!, label) >= TEXT_CONTRAST)
    return blendHex;
  const rest = toOklch(primary);
  const step = Math.abs(toOklch(blend).l - rest.l);
  const away = relativeLuminance(primary) >= relativeLuminance(label) ? 1 : -1;
  const mirrored = fromOklch({ ...rest, l: rest.l + away * step });
  return reachContrast(mirrored, [label], TEXT_CONTRAST) ?? toHex(primary);
}

/**
 * The built-in focus ring (`--ring` at 50% over the page), moved away from the
 * page until it reaches 3:1 against every surface in `FOCUS_SURFACES`.
 */
function focusRingFor(mode: ColorMode, primary: Rgb): string {
  const surfaces = FOCUS_SURFACES[mode].map((color) => parseCssColor(color)!);
  const [page] = surfaces;
  const fallback =
    contrastRatio(page, WHITE) >= contrastRatio(page, BLACK) ? WHITE : BLACK;
  return (
    reachContrast(over(primary, page, RING_OPACITY), surfaces, UI_CONTRAST) ??
    toHex(fallback)
  );
}

/** `color` at `opacity` composited over an opaque `backdrop`, as the browser paints it. */
function over(color: Rgb, backdrop: Rgb, opacity: number): Rgb {
  const mix = (a: number, b: number) => a * opacity + b * (1 - opacity);
  return {
    r: mix(color.r, backdrop.r),
    g: mix(color.g, backdrop.g),
    b: mix(color.b, backdrop.b),
  };
}

/**
 * The first shade of `start`, stepping OKLCH lightness away from `against[0]`,
 * whose hex reaches `minimum` against every colour in `against`; null when even
 * the end of the range does not.
 */
function reachContrast(
  start: Rgb,
  against: readonly Rgb[],
  minimum: number,
): string | null {
  const base = toOklch(start);
  const direction =
    relativeLuminance(start) >= relativeLuminance(against[0]) ? 1 : -1;
  for (let step = 0; ; step++) {
    const l = Math.min(
      1,
      Math.max(0, base.l + direction * step * LIGHTNESS_STEP),
    );
    const hex = toHex(fromOklch({ ...base, l }));
    const shade = parseCssColor(hex)!;
    if (against.every((color) => contrastRatio(shade, color) >= minimum))
      return hex;
    if (l === 0 || l === 1) return null;
  }
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

/** Rounded down, so a ratio under the minimum never prints as the minimum. */
function floorTo2(value: number): number {
  return Math.floor(value * 100) / 100;
}
