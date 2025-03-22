"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { AnalyticsProvider } from "./analytics-provider";

interface GlobalProviderProps {
  children: ReactNode;
  themeAttribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

/**
 * Global provider component that wraps all application-wide providers
 * Includes theme and analytics providers
 */
export function GlobalProvider({
  children,
  themeAttribute = "data-theme",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange,
}: GlobalProviderProps) {
  return (
    <ThemeProvider 
      attribute={themeAttribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
    >
      <AnalyticsProvider>
        {children}
      </AnalyticsProvider>
    </ThemeProvider>
  );
} 