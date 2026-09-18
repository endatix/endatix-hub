import {
  DEFAULT_PDF_THEME,
  type PdfTheme,
} from "@/features/pdf-export/pdf-theme";
import { hubTokenFallbacks } from "@/lib/themes/endatix-themes";

const PAGE_BG_KEYS = [
  "--sjs2-color-utility-surface-survey",
  "--sjs2-color-utility-body",
  "--sjs-general-backcolor-dim",
  "--sjs-general-backcolor",
];
const SURFACE_KEYS = [
  "--sjs-questionpanel-backcolor",
  "--sjs2-color-bg-basic-primary",
  "--sjs-general-backcolor",
];
const INPUT_KEYS = [
  "--sjs2-color-component-formbox-default-bg",
  "--sjs-editorpanel-backcolor",
  "--sjs2-color-bg-basic-secondary",
  "--sjs-general-backcolor-dim-light",
];
const PRIMARY_KEYS = [
  "--sjs2-color-project-brand-600",
  "--sjs2-color-fg-brand-primary",
  "--sjs-primary-backcolor",
];
const ON_PRIMARY_KEYS = [
  "--sjs2-color-fg-brand-on-primary",
  "--sjs-primary-forecolor",
];
const TEXT_KEYS = [
  "--sjs2-color-fg-basic-primary",
  "--sjs-general-forecolor",
];
const MUTED_KEYS = [
  "--sjs2-color-fg-basic-secondary",
  "--sjs-general-forecolor-light",
];
const BORDER_KEYS = [
  "--sjs2-color-border-basic-secondary",
  "--sjs-border-default",
  "--sjs-border-inside",
];
const POSITIVE_KEYS = [
  "--sjs2-color-bg-positive-primary",
  "--sjs-special-green",
  "--sjs2-palette-green-600",
];
const NEGATIVE_KEYS = [
  "--sjs-special-red",
  "--sjs2-palette-red-600",
];
const RADIUS_KEYS = ["--sjs2-base-unit-radius", "--sjs-corner-radius"];
const FONT_SIZE_KEYS = ["--sjs-font-size", "--sjs2-base-unit-font-size"];

const VAR_REF = /^var\(\s*([^,\s]+)\s*(?:,\s*(.+))?\s*\)$/i;
const MIN_PRINT_FONT = 9;
const MAX_PRINT_FONT = 12;

export function parseThemeJson(json: string | undefined | null): unknown {
  if (!json?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(json) as unknown;
  } catch {
    return undefined;
  }
}

export function mapSurveyThemeToPdfTheme(theme: unknown): PdfTheme {
  const cssVariables = readCssVariables(theme);
  const resolve = (keys: string[], fallback: string) =>
    firstColor(cssVariables, keys, fallback);

  return {
    pageBackground: resolve(PAGE_BG_KEYS, DEFAULT_PDF_THEME.pageBackground),
    surface: resolve(SURFACE_KEYS, DEFAULT_PDF_THEME.surface),
    inputBackground: resolve(INPUT_KEYS, DEFAULT_PDF_THEME.inputBackground),
    primary: resolve(PRIMARY_KEYS, DEFAULT_PDF_THEME.primary),
    onPrimary: resolve(ON_PRIMARY_KEYS, DEFAULT_PDF_THEME.onPrimary),
    text: resolve(TEXT_KEYS, DEFAULT_PDF_THEME.text),
    mutedText: resolve(MUTED_KEYS, DEFAULT_PDF_THEME.mutedText),
    border: resolve(BORDER_KEYS, DEFAULT_PDF_THEME.border),
    positive: resolve(POSITIVE_KEYS, DEFAULT_PDF_THEME.positive),
    negative: resolve(NEGATIVE_KEYS, DEFAULT_PDF_THEME.negative),
    radius: firstLength(cssVariables, RADIUS_KEYS, DEFAULT_PDF_THEME.radius),
    fontSize: clampPrintFont(
      firstLength(cssVariables, FONT_SIZE_KEYS, DEFAULT_PDF_THEME.fontSize),
    ),
  };
}

function clampPrintFont(px: number): number {
  return Math.min(MAX_PRINT_FONT, Math.max(MIN_PRINT_FONT, Math.round(px)));
}

function readCssVariables(theme: unknown): Record<string, string> {
  if (theme === null || typeof theme !== "object" || Array.isArray(theme)) {
    return {};
  }

  const cssVariables = (theme as { cssVariables?: unknown }).cssVariables;
  if (
    cssVariables === null ||
    typeof cssVariables !== "object" ||
    Array.isArray(cssVariables)
  ) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(cssVariables)) {
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

function firstColor(
  vars: Record<string, string>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const parsed = parseCssColor(vars[key], vars);
    if (parsed) {
      return parsed;
    }
  }
  return fallback;
}

function firstLength(
  vars: Record<string, string>,
  keys: string[],
  fallback: number,
): number {
  for (const key of keys) {
    const parsed = parseCssLength(vars[key], vars);
    if (parsed !== null) {
      return parsed;
    }
  }
  return fallback;
}

function parseCssColor(
  raw: string | undefined,
  vars: Record<string, string>,
  depth = 0,
): string | null {
  if (!raw || depth > 4) {
    return null;
  }

  const value = raw.trim();
  const varMatch = VAR_REF.exec(value);
  if (varMatch) {
    const token = varMatch[1];
    const fallback = varMatch[2]?.trim();
    const fromTheme = parseCssColor(vars[token], vars, depth + 1);
    if (fromTheme) {
      return fromTheme;
    }
    const fromHub = hubTokenFallbacks[token];
    if (fromHub) {
      return parseCssColor(fromHub, vars, depth + 1);
    }
    return parseCssColor(fallback, vars, depth + 1);
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    return expandHex(value);
  }

  const rgb =
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)/i.exec(
      value,
    );
  if (rgb) {
    return rgbToHex(
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      parseAlpha(rgb[4]),
    );
  }

  const hsl =
    /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.%]+))?/i.exec(
      value,
    );
  if (hsl) {
    return hslToHex(
      Number(hsl[1]),
      Number(hsl[2]) / 100,
      Number(hsl[3]) / 100,
      parseAlpha(hsl[4]),
    );
  }

  return null;
}

function parseAlpha(raw: string | undefined): number {
  if (!raw) {
    return 1;
  }
  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    return Number(trimmed.slice(0, -1)) / 100;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return 1;
  }
  return n > 1 ? n / 255 : n;
}

function parseCssLength(
  raw: string | undefined,
  vars: Record<string, string>,
  depth = 0,
): number | null {
  if (!raw || depth > 4) {
    return null;
  }

  const value = raw.trim();
  const varMatch = VAR_REF.exec(value);
  if (varMatch) {
    const token = varMatch[1];
    const fallback = varMatch[2]?.trim();
    const fromTheme = parseCssLength(vars[token], vars, depth + 1);
    if (fromTheme !== null) {
      return fromTheme;
    }
    const fromHub = hubTokenFallbacks[token];
    if (fromHub) {
      return parseCssLength(fromHub, vars, depth + 1);
    }
    return parseCssLength(fallback, vars, depth + 1);
  }

  const match = /^([\d.]+)(px|pt|rem)?$/i.exec(value);
  if (!match) {
    return null;
  }

  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }

  const unit = match[2]?.toLowerCase();
  if (unit === "rem") {
    return Math.round(n * 12);
  }
  return Math.round(n);
}

function expandHex(hex: string): string {
  const body = hex.slice(1);
  if (body.length === 3) {
    return `#${body
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toLowerCase()}`;
  }
  if (body.length === 8) {
    const r = Number.parseInt(body.slice(0, 2), 16);
    const g = Number.parseInt(body.slice(2, 4), 16);
    const b = Number.parseInt(body.slice(4, 6), 16);
    const a = Number.parseInt(body.slice(6, 8), 16) / 255;
    return rgbToHex(r, g, b, a);
  }
  return `#${body.slice(0, 6).toLowerCase()}`;
}

function rgbToHex(r: number, g: number, b: number, alpha = 1): string {
  const a = Math.max(0, Math.min(1, alpha));
  const blend = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(a * channel + (1 - a) * 255)));
  const hex = (n: number) => blend(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hslToHex(h: number, s: number, l: number, alpha = 1): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255, alpha);
}
