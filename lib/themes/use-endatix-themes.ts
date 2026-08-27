"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { pickCreatorTheme, pickSurveyTheme } from "./endatix-themes";

/**
 * Survey Creator chrome aligned with `ThemeProvider` / `globals.css` tokens.
 */
export function useEndatixCreatorTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => pickCreatorTheme(resolvedTheme), [resolvedTheme]);
}

/**
 * Survey Model theme for `Model.applyTheme`, aligned with app theme.
 */
export function useEndatixSurveyTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => pickSurveyTheme(resolvedTheme), [resolvedTheme]);
}
