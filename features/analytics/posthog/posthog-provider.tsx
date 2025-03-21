"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { ReactNode, Suspense, useEffect } from "react";
import { getDefaultPostHogConfig, isDebugMode } from "./config";
import { PostHogConfig } from "./posthog-types";
import { PostHogPageView } from "./posthog-pageview";

interface PostHogProviderProps {
  children: ReactNode;
  config?: PostHogConfig;
}

/**
 * PostHog Provider component to wrap your application
 * This provider initializes PostHog and provides context for tracking components
 */
export function PostHogProvider({
  children,
  config: providedConfig,
}: PostHogProviderProps) {
  const config = providedConfig || getDefaultPostHogConfig();
  const debugMode = isDebugMode();

  useEffect(() => {
    if (typeof window !== "undefined" && config.enabled) {
      posthog.init(config.apiKey, {
        api_host: config.apiHost,
        ui_host: config.uiHost,
        capture_pageview: false, // this is handled by the PostHogPageView component
        autocapture: true,
        debug: debugMode,
      });
    }
  }, [config, debugMode]);

  // If PostHog is disabled, just render children without the provider
  if (!config.enabled) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
