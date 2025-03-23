"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

type DefaultableThemeProviderProps = Partial<ThemeProviderProps> & {
  children: React.ReactNode;
};

/**
 * ThemeProvider component with Endatix default values
 * Wraps next-themes provider with sensible defaults
 */
export function ThemeProvider({ 
  children,
  attribute = "class", 
  defaultTheme = "light",
  enableSystem = true,
  disableTransitionOnChange = true,
  ...otherProps 
}: DefaultableThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute={attribute} 
      defaultTheme={defaultTheme} 
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...otherProps}
    >
      {children}
    </NextThemesProvider>
  );
} 