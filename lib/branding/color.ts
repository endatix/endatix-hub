/**
 * Colour maths for the brand palette: CSS colour parsing, sRGB <-> OKLCH, and
 * the WCAG 2.x contrast ratio. Pure and dependency-free, and free of `@/` imports
 * so `scripts/brand-pack.mjs` can bundle it.
 */

/** sRGB channels in 0..1. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** OKLCH: lightness 0..1, chroma >= 0, hue in degrees 0..360. */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
const ARG = `(${NUMBER})(%|deg)?`;
/** One separator style per value: all commas (`rgb()`/`hsl()` only) or all spaces. */
const COMMA_ARGS = new RegExp(
  String.raw`^(rgb|hsl)a?\(\s*${ARG}\s*,\s*${ARG}\s*,\s*${ARG}\s*\)$`,
  "i",
);
/** CSS has no `oklcha()`. */
const SPACE_ARGS = new RegExp(
  String.raw`^(rgb|hsl|oklch(?!a))a?\(\s*${ARG}\s+${ARG}\s+${ARG}\s*\)$`,
  "i",
);
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** One argument: its number and unit ("" for a bare number). */
interface Arg {
  readonly value: number;
  readonly unit: "" | "%" | "deg";
}

/** CSS Color 4: 100% oklch chroma is 0.4. */
const OKLCH_CHROMA_PERCENT = 0.4 / 100;

/**
 * Reads `#rgb`, `#rrggbb`, `rgb()`, `hsl()` and `oklch()` (comma or space
 * separated, not mixed; oklch space only; no alpha), with the units CSS allows
 * per argument. Returns null
 * for anything else, including named colours.
 */
export function parseCssColor(input: string): Rgb | null {
  const value = input.trim();
  const hex = HEX.exec(value);
  if (hex) return parseHex(hex[1]);

  const commas = COMMA_ARGS.exec(value);
  const match = commas ?? SPACE_ARGS.exec(value);
  if (!match) return null;
  const args: Arg[] = [2, 4, 6].map((i) => ({
    value: Number(match[i]),
    unit: (match[i + 1]?.toLowerCase() ?? "") as Arg["unit"],
  }));
  if (args.some((arg) => !Number.isFinite(arg.value))) return null;
  const kind = match[1].toLowerCase();
  if (kind === "rgb") return rgbFromArgs(args, commas !== null);
  if (kind === "hsl") return hslFromArgs(args, commas !== null);
  return oklchFromArgs(args);
}

/** The legacy comma form needs one unit throughout; the space form mixes them. */
function rgbFromArgs(args: readonly Arg[], commas: boolean): Rgb | null {
  if (args.some((arg) => arg.unit === "deg")) return null;
  if (commas && args.some((arg) => arg.unit !== args[0].unit)) return null;
  const [r, g, b] = args.map((arg) =>
    clamp01(arg.unit === "%" ? arg.value / 100 : arg.value / 255),
  );
  return { r, g, b };
}

/** The comma syntax needs a percentage for saturation and lightness; the space syntax also takes a number. */
function hslFromArgs([h, s, l]: readonly Arg[], commas: boolean): Rgb | null {
  if (h.unit === "%" || s.unit === "deg" || l.unit === "deg") return null;
  if (commas && (s.unit !== "%" || l.unit !== "%")) return null;
  return hslToRgb(h.value, s.value / 100, l.value / 100);
}

function oklchFromArgs([l, c, h]: readonly Arg[]): Rgb | null {
  if (l.unit === "deg" || c.unit === "deg" || h.unit === "%") return null;
  return fromOklch({
    l: l.unit === "%" ? l.value / 100 : l.value,
    // CSS clamps a negative chroma to 0 (neutral grey).
    c: Math.max(0, c.unit === "%" ? c.value * OKLCH_CHROMA_PERCENT : c.value),
    h: h.value,
  });
}

function parseHex(digits: string): Rgb {
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;
  const channel = (i: number) =>
    Number.parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4) };
}

/** The RGB order of chroma (c) and the second-largest component (x) per 60° of hue. */
const HUE_SECTORS: readonly ((
  c: number,
  x: number,
) => [number, number, number])[] = [
  (c, x) => [c, x, 0],
  (c, x) => [x, c, 0],
  (c, x) => [0, c, x],
  (c, x) => [0, x, c],
  (c, x) => [x, 0, c],
  (c, x) => [c, 0, x],
];

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const s = clamp01(saturation);
  const l = clamp01(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const [r, g, b] = HUE_SECTORS[Math.min(5, Math.floor(h))](chroma, x);
  const m = l - chroma / 2;
  return { r: r + m, g: g + m, b: b + m };
}

/** `#rrggbb`, channels rounded to the nearest byte. */
export function toHex(color: Rgb): string {
  const byte = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}`;
}

export function toOklch(color: Rgb): Oklch {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  const h =
    c < 1e-6 ? 0 : ((((Math.atan2(B, A) * 180) / Math.PI) % 360) + 360) % 360;
  return { l: L, c, h };
}

/**
 * OKLCH to sRGB. A colour outside the sRGB gamut keeps its lightness and hue
 * and loses chroma until it fits, so a derived shade never shifts hue.
 */
export function fromOklch(color: Oklch): Rgb {
  const l = clamp01(color.l);
  const exact = oklchToRgbUnclamped({ ...color, l });
  if (inGamut(exact)) return clampRgb(exact);

  let low = 0;
  let high = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToRgbUnclamped({ l, c: mid, h: color.h }))) low = mid;
    else high = mid;
  }
  return clampRgb(oklchToRgbUnclamped({ l, c: low, h: color.h }));
}

function oklchToRgbUnclamped({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180;
  const A = c * Math.cos(radians);
  const B = c * Math.sin(radians);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * toLinear(color.r) +
    0.7152 * toLinear(color.g) +
    0.0722 * toLinear(color.b)
  );
}

/** WCAG 2.x contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const GAMUT_EPSILON = 1e-4;

function inGamut(color: Rgb): boolean {
  return [color.r, color.g, color.b].every(
    (v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON,
  );
}

function clampRgb(color: Rgb): Rgb {
  return { r: clamp01(color.r), g: clamp01(color.g), b: clamp01(color.b) };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  const sign = channel < 0 ? -1 : 1;
  const abs = Math.abs(channel);
  return abs <= 0.0031308
    ? channel * 12.92
    : sign * (1.055 * abs ** (1 / 2.4) - 0.055);
}
