"use client";

import { ReactNode, Suspense, useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import {
  createPostHogConfig,
  isPostHogEnabled,
  isDebugMode,
} from "../shared/config";
import { PostHogPageView } from "./pageview";
import { PostHogUserIdentity } from "./user-identity";
import { initPostHog } from "./client";
import type { SessionData } from "@/features/auth";

interface PostHogProviderProps {
  children: ReactNode;
  session?: SessionData;
}

/**
 * PostHog analytics provider component
 * Handles initialization and user identification
 */
export function PostHogProvider({ children, session }: PostHogProviderProps) {
  const config = createPostHogConfig();
  const analyticsEnabled = isPostHogEnabled(config);
  const debugMode = isDebugMode();

  useEffect(() => {
    if (!analyticsEnabled || typeof window === "undefined") return;

    initPostHog(config, {
      capturePageview: false, // We'll handle this with PostHogPageView
      disableSessionRecording: false,
    });
  }, [analyticsEnabled, config, debugMode]);

  // If analytics is disabled, just render children
  if (!analyticsEnabled) {
    return <>{children}</>;
  }

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
