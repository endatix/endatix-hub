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

function variableReference(token: string) {
  if (!token.startsWith("var(") || !token.endsWith(")")) return;
  const args = token.slice(4, -1);
  const comma = args.indexOf(",");
  const name = (comma < 0 ? args : args.slice(0, comma)).trim();
  if (!/^--[\w-]+$/.test(name)) return;
  if (comma < 0) return { name };

  const rest = args.slice(comma + 1);
  // Leading whitespace is allowed, but the fallback must contain at least
  // one character and cannot span lines.
  const fallback = rest.trimStart() || rest.slice(-1);
  if (!fallback || /[\r\n\u2028\u2029]/.test(fallback)) return;
  return { name, fallback };
}

function literal(
  value: unknown,
  vars: Variables,
  depth = 0,
): string | undefined {
  if (typeof value !== "string" || value.length > 256 || depth > 4) return;
  const ref = variableReference(value.trim());
  if (!ref) return value.trim();
  return (
    literal(vars[ref.name], vars, depth + 1) ?? literal(ref.fallback, vars, depth + 1)
  );
}

function printableColor(value: string | undefined) {
  if (!value) return;
  const rgba = /^rgba\(([\d.,\s]+),\s*(0(?:\.\d+)?|1(?:\.0+)?)\)$/i.exec(value);
  const rgb = parseCssColor(rgba ? `rgb(${rgba[1]})` : value);
  if (!rgb) return;
  const alpha = rgba ? Number(rgba[2]) : 1;
  const hex = toHex(rgb);
  return alpha === 1 ? hex : hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
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
