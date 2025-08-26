"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { PostHogProvider } from "@/features/analytics/posthog/client";
import { SessionProvider } from "next-auth/react";
import type { SessionData } from "@/features/auth";
import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "sonner";

// Options for enabling specific features
interface AppProviderOptions {
  enableTheme?: boolean;
  enableAnalytics?: boolean;
  enableAuth?: boolean;
  enableToaster?: boolean;
}

// Theme options - use next-themes types for compatibility
type ThemeOptions = Partial<Omit<ThemeProviderProps, "children">>;

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
  options = {
    enableTheme: true,
    enableAnalytics: true,
    enableAuth: true,
    enableToaster: true,
  },
  themeOptions = {},
}: AppProviderProps) {
  const { enableTheme, enableAnalytics, enableToaster, enableAuth} = options;

  // Build the provider stack based on enabled features
  let content = <>{children}</>;

  // Add NextAuth session provider if enabled
  if (enableAuth) {
    content = <SessionProvider>{content}</SessionProvider>;
  }

  // Add analytics provider if enabled
  if (enableAnalytics) {
    content = <PostHogProvider session={session}>{content}</PostHogProvider>;
  }

  // Add theme provider if enabled
  if (enableTheme) {
    content = <ThemeProvider {...themeOptions}>{content}</ThemeProvider>;
  }

  // Add toaster if enabled
  if (enableToaster) {
    content = (
      <>
        {content}
        <Toaster expand={false} duration={Infinity} visibleToasts={5} />
      </>
    );
  }

  return content;
}
