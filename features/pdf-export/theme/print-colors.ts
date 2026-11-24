import { contrastRatio, over, parseCssColor, rotateHue, toHex, type Rgb } from "@/lib/branding/color";
import type { PdfBodyLayer } from "./form-theme";

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
  const ink = toHex(preferred);
  const paper = parseCssColor(toHex(surface))!;
  if (contrastRatio(parseCssColor(ink)!, paper) >= 4.5) return ink;
  return contrastRatio(PAPER, paper) >= contrastRatio(INK, paper) ? "#ffffff" : "#000000";
}

function tableBand(theme: PdfBodyLayer, deploymentAccent?: string) {
  if (theme.tableHeaderBackground) return theme.tableHeaderBackground;
  if (theme.accent) return theme.accent;
  if (!deploymentAccent) return theme.pageBackground ? "transparent" : "#414141";
  const seed = painted(deploymentAccent, PAPER);
  return contrastRatio(seed, PAPER) < 1.1 ? toHex(over(INK, seed, 0.16)) : deploymentAccent;
}

function printSurfaces(theme: PdfBodyLayer, deploymentAccent?: string) {
  const page = painted(theme.pageBackground, PAPER);
  const band = tableBand(theme, deploymentAccent);
  const header = painted(band, page);
  const seed = theme.accent ? painted(theme.accent, page) : header;
  const field = over(seed, page, 0.14);
  const panel = theme.tableHeaderBackground ?? (theme.pageBackground && !theme.accent ? "transparent" : toHex(field));
  const noteHue = rotateHue(seed, 35);
  const note = over(noteHue, page, 0.23);
  return { page, band, header, seed, field, panel, noteHue, note };
}

function headingInk(hue: Rgb, surface: Rgb) {
  const charcoal = parseCssColor("#171d27")!;
  for (let step = 0; step <= 100; step++) {
    const ink = over(charcoal, hue, step / 100);
    if (contrastRatio(ink, surface) >= 5) return toHex(ink);
  }
  return readable(hue, surface);
}

function inksOn(theme: PdfBodyLayer, seed: Rgb, surface: Rgb) {
  const ink = (token: string | undefined, fallback: Rgb) =>
    readable(token ? painted(token, surface) : fallback, surface);
  const body = over(seed, parseCssColor("#18212b")!, 0.08);
  const caption = over(seed, parseCssColor("#45515d")!, 0.15);
  return {
    body: ink(theme.text, body),
    caption: ink(theme.mutedText ?? theme.text, caption),
    heading: theme.accent || theme.text
      ? ink(theme.accent ?? theme.text, body)
      : headingInk(over(seed, body, 0.77), surface),
  };
}

export function printColors(theme: PdfBodyLayer, deploymentAccent?: string) {
  const s = printSurfaces(theme, deploymentAccent);
  const page = inksOn(theme, s.seed, s.page);
  const properties = inksOn(theme, s.seed, painted(s.panel, s.page));
  const note = inksOn(theme, s.seed, s.note);
  return {
    page, properties, panel: s.panel, band: s.band,
    headerInk: readable(theme.text ? painted(theme.text, s.header) : PAPER, s.header),
    fieldTint: toHex(s.field), fieldInk: inksOn(theme, s.seed, s.field).heading,
    noteTint: toHex(s.note), noteInk: note.body,
    noteHeading: theme.accent || theme.text ? note.heading : headingInk(s.noteHue, s.note),
    rule: theme.tableBorder ?? toHex(over(s.seed, parseCssColor("#a1a9b2")!, 0.24)),
  };
}
