"use client";

import { ReactNode, useEffect, createContext } from "react";
import posthog from "posthog-js";
import { initPostHog } from "./posthog-client";
import { PostHogConfig } from "./posthog-types";

// Create a context to provide PostHog instance
export const PostHogContext = createContext<typeof posthog | null>(null);

interface PostHogProviderProps {
  children: ReactNode;
  config: PostHogConfig;
}

/**
 * PostHog Provider component to wrap your application
 * This provider initializes PostHog and provides context for tracking components
 */
export function PostHogProvider({ children, config }: PostHogProviderProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && config.enabled) {
      initPostHog(config);
    }
  }, [config]);

  // If PostHog is disabled, just render children without the provider
  if (!config.enabled) {
    return <>{children}</>;
  }

  console.log("PostHogProvider", posthog);
  return (
    <PostHogContext.Provider value={posthog}>
      {children}
    </PostHogContext.Provider>
  );
}
