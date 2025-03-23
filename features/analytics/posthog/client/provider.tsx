'use client';

import { ReactNode, Suspense, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { 
  createPostHogConfig, 
  isPostHogEnabled, 
  isDebugMode 
} from "../shared/config";
import { PostHogPageView } from "./pageview";
import { PostHogUserIdentity } from "./user-identity";
import type { SessionData } from "@/features/auth";

interface PostHogProviderProps {
  children: ReactNode;
  session?: SessionData;
}

/**
 * PostHog analytics provider component
 * Handles initialization and user identification
 */
export function PostHogProvider({
  children,
  session
}: PostHogProviderProps) {
  // Initialize analytics
  const config = createPostHogConfig();
  const analyticsEnabled = isPostHogEnabled(config);
  const debugMode = isDebugMode();

  // Initialize PostHog
  useEffect(() => {
    if (!analyticsEnabled || typeof window === "undefined") return;

    // Initialize PostHog
    posthog.init(config.apiKey, {
      api_host: config.apiHost,
      ui_host: config.uiHost,
      capture_pageview: false, // We'll handle this with PostHogPageView
      autocapture: true,
      person_profiles: "identified_only",
      debug: debugMode,
    });
  }, [analyticsEnabled, config, debugMode]);

  // If analytics is disabled, just render children
  if (!analyticsEnabled) {
    return <>{children}</>;
  }

  // Render PostHog provider with components
  return (
    <PHProvider client={posthog}>
      {children}
      <Suspense fallback={null}>
        <PostHogPageView />
        <PostHogUserIdentity session={session} />
      </Suspense>
    </PHProvider>
  );
} 