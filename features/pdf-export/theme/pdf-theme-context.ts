import { AsyncLocalStorage } from "node:async_hooks";
import {
  createPdfStyles,
  DEFAULT_PDF_THEME,
  resolvePdfTheme,
} from "./pdf-styles";
import { formThemeToPdfLayer } from "./form-theme";
import type { FormDefinition } from "@/types";

const defaults = createPdfStyles(DEFAULT_PDF_THEME);
const rendering = new AsyncLocalStorage<typeof defaults>();

/** The route handler uses server React, where a React context provider is unavailable. */
export function withPdfStyles<T>(
  definition: Pick<FormDefinition, "themeModel"> | undefined,
  render: () => T,
): T {
  return rendering.run(
    createPdfStyles(resolvePdfTheme({ form: formThemeToPdfLayer(definition) })),
    render,
  );
}

export const currentPdfStyles = () => rendering.getStore() ?? defaults;
