import { contrastRatio, over, parseCssColor, toHex, type Rgb } from "@/lib/branding/color";
import type { PdfBodyLayer } from "./form-theme";
import { PROPERTIES_PAPER } from "../submission/pdf-styles";

const PAPER = { r: 1, g: 1, b: 1 };
const INK = { r: 0, g: 0, b: 0 };

/** The form layer supplies six- or eight-digit hex. Contrast uses the painted colour. */
function painted(hex: string | undefined, backdrop: Rgb) {
  if (!hex) return backdrop;
  const color = parseCssColor(hex.slice(0, 7));
  if (!color) return backdrop;
  const opacity = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) / 255 : 1;
  return over(color, backdrop, opacity);
}

function readable(preferred: Rgb, surface: Rgb) {
  if (contrastRatio(preferred, surface) >= 4.5) return toHex(preferred);
  return contrastRatio(PAPER, surface) >= contrastRatio(INK, surface) ? "#ffffff" : "#000000";
}

export function propertyInks(theme: PdfBodyLayer, panel: string = PROPERTIES_PAPER) {
  const surface = painted(panel, painted(theme.pageBackground, PAPER));
  const ink = (hex: string) => ({ color: readable(painted(hex, surface), surface) });
  return {
    title: ink(theme.accent ?? theme.text ?? "#000000"),
    label: ink(theme.mutedText ?? theme.text ?? "#666666"),
    value: ink(theme.text ?? "#222222"),
  };
}

export function printColors(theme: PdfBodyLayer, header: string) {
  const page = painted(theme.pageBackground, PAPER);
  const body = theme.text ? painted(theme.text, page) : INK;
  const surface = painted(header, page);
  const accent = painted(theme.accent, contrastRatio(surface, page) < 1.5 ? body : surface);
  const tint = over(accent, page, 0.09);
  return {
    headerInk: readable(body, surface),
    fieldTint: toHex(tint),
    fieldInk: readable(body, tint),
    headingInk: readable(painted(theme.accent, body), page),
  };
}
