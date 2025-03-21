"use client";

import { ReactNode } from "react";
import { PostHogProvider, PostHogPageView } from "./index";
import { createPostHogConfig, isPostHogEnabled } from "./config";

interface AnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Application-specific PostHog provider that handles configuration
 * and integrates page view tracking
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Create the PostHog configuration from environment variables
  const config = createPostHogConfig();
  console.log("config", config);

  // Skip if PostHog is not properly configured
  if (!isPostHogEnabled(config)) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider config={config}>
      {children}
      <PostHogPageView />
    </PostHogProvider>
  );
}
