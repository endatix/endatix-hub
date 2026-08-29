"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { EndatixConfigProvider } from "./endatix-config-provider";
import { PostHogProvider } from "@/features/analytics/posthog/client";
import type { ClientEndatixConfig } from "@/features/config/client-endatix-config";
import { SessionProvider } from "next-auth/react";
import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "sonner";
import { SidebarProvider } from "../ui/sidebar";
import { Session } from "next-auth";
import { withBasePath } from "@/lib/hosting/base-path";

const authBasePath = withBasePath("/api/auth");

// Options for enabling specific features
interface AppProviderOptions {
  enableTheme?: boolean;
  enableAnalytics?: boolean;
  enableSession?: boolean;
  enableToaster?: boolean;
  enableSidebar?: boolean;
}

// Theme options - use next-themes types for compatibility
type ThemeOptions = Partial<Omit<ThemeProviderProps, "children">>;

// Predefined options
export const AppOptions = {
  PublicPages: {
    enableTheme: false,
    enableAnalytics: true,
    enableSession: false,
    enableToaster: false,
    enableSidebar: false,
  } as AppProviderOptions,
};

// Main props interface
interface AppProviderProps {
  children: ReactNode;
  session?: Session | null;
  options?: AppProviderOptions;
  themeOptions?: ThemeOptions;
  sidebarDefaultOpen?: boolean;
  /** Safe request-time browser read-only projection of endatix config properties */
  endatixConfig: ClientEndatixConfig;
}

/** Default for sidebar open state when layout does not pass it (avoids server cookie read). */
export const DEFAULT_SIDEBAR_OPEN = true;

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
    enableSession: true,
    enableToaster: true,
    enableSidebar: true,
  },
  themeOptions = {},
  sidebarDefaultOpen = DEFAULT_SIDEBAR_OPEN,
  endatixConfig,
}: Readonly<AppProviderProps>) {
  const {
    enableTheme,
    enableAnalytics,
    enableToaster,
    enableSession,
    enableSidebar,
  } = options;

  // Build the provider stack based on enabled features
  let content = <>{children}</>;

  // Add NextAuth session provider if enabled
  if (enableSession) {
    content = (
      <SessionProvider session={session} basePath={authBasePath}>
        {content}
      </SessionProvider>
    );
  }

  // Add sidebar provider if enabled
  if (enableSidebar) {
    content = (
      <SidebarProvider defaultOpen={sidebarDefaultOpen}>
        {content}
      </SidebarProvider>
    );
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

  // Outermost: memoized env projection. Session/theme live inside this
  // provider so those context updates do not change this value.
  return (
    <EndatixConfigProvider value={endatixConfig}>
      {content}
    </EndatixConfigProvider>
  );
}
