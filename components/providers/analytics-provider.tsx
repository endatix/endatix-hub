"use client";

import { ReactNode } from "react";
// Using relative imports to avoid module resolution issues
import { PostHogProvider, PostHogPageView } from "../../features/analytics/posthog/client";
import { createPostHogConfig, isPostHogEnabled } from "../../features/analytics/posthog/shared/config";

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