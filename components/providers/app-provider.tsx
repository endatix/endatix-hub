"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { PostHogProvider } from "@/features/analytics/posthog/client";
import type { SessionData } from "@/features/auth";

// Options for enabling specific features
interface AppProviderOptions {
  enableTheme?: boolean;
  enableAnalytics?: boolean;
}

// Theme options - all optional. Defaults will be used when not provided
interface ThemeOptions {
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

// Predefined options
export const AppOptions = {
  NoTheme: { enableTheme: false, enableAnalytics: true } as AppProviderOptions,
};

// Main props interface
interface AppProviderProps {
  children: ReactNode;
  session?: SessionData;
  options?: AppProviderOptions;
  themeOptions?: ThemeOptions;
}

/**
 * Application provider component
 * Configurable provider that can enable/disable different features
 */
export function AppProvider({
  children,
  session,
  options = { enableTheme: true, enableAnalytics: true },
  themeOptions = {},
}: AppProviderProps) {
  const { enableTheme = true, enableAnalytics = true } = options;

  // Build the provider stack based on enabled features
  let content = <>{children}</>;

  // Add analytics provider if enabled
  if (enableAnalytics) {
    content = <PostHogProvider session={session}>{content}</PostHogProvider>;
  }

  // Add theme provider if enabled
  if (enableTheme) {
    content = <ThemeProvider {...themeOptions}>{content}</ThemeProvider>;
  }

  return content;
}
