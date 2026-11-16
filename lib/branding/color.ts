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

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)`;
const SEPARATOR = String.raw`(?:\s*,\s*|\s+)`;
const FUNCTION_ARGS = new RegExp(
  String.raw`^(rgb|hsl|oklch)a?\(\s*(${NUMBER})(%|deg)?${SEPARATOR}(${NUMBER})(%)?${SEPARATOR}(${NUMBER})(%)?\s*\)$`,
  "i",
);
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Reads `#rgb`, `#rrggbb`, `rgb()`, `hsl()` and `oklch()` (comma or space
 * separated, no alpha). Returns null for anything else, including named colours.
 */
export function parseCssColor(input: string): Rgb | null {
  const value = input.trim();
  const hex = HEX.exec(value);
  if (hex) return parseHex(hex[1]);

  const match = FUNCTION_ARGS.exec(value);
  if (!match) return null;
  const [, fn, a, aUnit, b, bUnit, c, cUnit] = match;
  const kind = fn.toLowerCase();
  if (kind === "rgb") return rgbFromArgs([a, b, c], [aUnit, bUnit, cUnit]);
  if (kind === "hsl")
    return hslToRgb(Number(a), Number(b) / 100, Number(c) / 100);
  const l = cUnit === undefined && aUnit === "%" ? Number(a) / 100 : Number(a);
  return fromOklch({ l, c: Number(b), h: Number(c) });
}

function parseHex(digits: string): Rgb {
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4) };
}

function rgbFromArgs(
  values: readonly string[],
  units: readonly (string | undefined)[],
): Rgb | null {
  if (units.some((unit) => unit === "deg")) return null;
  const [r, g, b] = values.map((value, i) =>
    clamp01(units[i] === "%" ? Number(value) / 100 : Number(value) / 255),
  );
  return { r, g, b };
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const s = clamp01(saturation);
  const l = clamp01(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const [r, g, b] =
    h < 1
      ? [chroma, x, 0]
      : h < 2
        ? [x, chroma, 0]
        : h < 3
          ? [0, chroma, x]
          : h < 4
            ? [0, x, chroma]
            : h < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
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
