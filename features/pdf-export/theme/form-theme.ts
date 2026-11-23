import { parseCssColor, toHex } from "@/lib/branding/color";
import type { FormDefinition } from "@/types";

const tokens = {
  pageBackground: [
    "--sjs2-color-utility-surface-survey",
    "--sjs2-color-utility-body",
    "--sjs-general-backcolor-dim",
    "--sjs-general-backcolor",
  ],
  text: ["--sjs2-color-fg-basic-primary", "--sjs-general-forecolor"],
  mutedText: [
    "--sjs2-color-fg-basic-secondary",
    "--sjs-general-forecolor-light",
  ],
  border: [
    "--sjs2-color-border-basic-secondary",
    "--sjs-border-default",
    "--sjs-border-inside",
  ],
  tableHeaderBackground: [
    "--sjs2-color-bg-basic-secondary",
    "--sjs-editorpanel-backcolor",
    "--sjs-general-backcolor-dim-light",
  ],
  accent: [
    "--sjs2-color-project-brand-600",
    "--sjs2-color-fg-brand-primary",
    "--sjs-primary-backcolor",
  ],
} as const;

export type PdfBodyLayer = Partial<
  Record<keyof typeof tokens | "tableBorder", string>
> & { radius?: number };
type Variables = Record<string, unknown>;

function literal(
  value: unknown,
  vars: Variables,
  depth = 0,
): string | undefined {
  if (typeof value !== "string" || value.length > 256 || depth > 4) return;
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value.trim());
  if (!ref) return value.trim();
  return (
    literal(vars[ref[1]], vars, depth + 1) ?? literal(ref[2], vars, depth + 1)
  );
}

function printableColor(value: string | undefined) {
  if (!value) return;
  const rgba = /^rgba\(([\d.,\s]+),\s*(0(?:\.\d+)?|1(?:\.0+)?)\)$/i.exec(value);
  const rgb = parseCssColor(rgba ? `rgb(${rgba[1]})` : value);
  if (!rgb) return;
  const alpha = rgba ? Number(rgba[2]) : 1;
  const flatten = (channel: number) => 1 - alpha + alpha * channel;
  return toHex({ r: flatten(rgb.r), g: flatten(rgb.g), b: flatten(rgb.b) });
}

function radius(value: string | undefined) {
  const match = /^(\d+(?:\.\d+)?)(px|pt|rem)?$/.exec(value ?? "");
  if (match)
    return Math.min(72, Number(match[1]) * (match[2] === "rem" ? 12 : 1));
}

function mapVariables(vars: Variables): PdfBodyLayer {
  const layer: PdfBodyLayer = {};
  for (const key of Object.keys(tokens) as (keyof typeof tokens)[]) {
    const color = tokens[key]
      .map((name) => printableColor(literal(vars[name], vars)))
      .find(Boolean);
    if (color) layer[key] = color;
  }
  if (layer.border) layer.tableBorder = layer.border;
  const r = radius(
    literal(
      vars["--sjs2-base-unit-radius"] ?? vars["--sjs-corner-radius"],
      vars,
    ),
  );
  if (r !== undefined) layer.radius = r;
  return layer;
}

/** Submission details include themeModel only when the form opts in. */
export function formThemeToPdfLayer(
  def?: Pick<FormDefinition, "themeModel">,
): PdfBodyLayer {
  if (typeof def?.themeModel !== "string") return {};
  try {
    const vars = JSON.parse(def.themeModel)?.cssVariables;
    return vars && typeof vars === "object" ? mapVariables(vars) : {};
  } catch {
    return {};
  }
}
