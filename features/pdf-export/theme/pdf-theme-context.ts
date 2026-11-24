import { AsyncLocalStorage } from "node:async_hooks";
import { createPdfStyles } from "./pdf-styles";
import { BUILT_IN_LIGHT_PRIMARY } from "@/lib/branding/palette";
import { parseCssColor, toHex } from "@/lib/branding/color";
import { formThemeToPdfLayer } from "./form-theme";
import type { FormDefinition } from "@/types";

const builtInAccent = toHex(parseCssColor(BUILT_IN_LIGHT_PRIMARY)!);
const defaults = createPdfStyles({}, builtInAccent);
const rendering = new AsyncLocalStorage<typeof defaults>();

/** The route handler uses server React, where a React context provider is unavailable. */
export function withPdfStyles<T>(
  definition: Pick<FormDefinition, "themeModel"> | undefined,
  render: () => T,
  deploymentAccent?: string,
): T {
  // Delivery means the form owns the body, even when none of its tokens can be printed.
  const styles = definition?.themeModel == null
    ? createPdfStyles({}, deploymentAccent ?? builtInAccent)
    : createPdfStyles(formThemeToPdfLayer(definition));
  return rendering.run(styles, render);
}

export const currentPdfStyles = () => rendering.getStore() ?? defaults;
