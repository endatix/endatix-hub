"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";
import type { SessionData } from "@/features/auth";

interface PostHogUserIdentityProps {
  session?: SessionData;
}

/**
 * Component that handles user identification in PostHog
 * Uses a privacy-focused approach with random IDs for all users
 */
export function PostHogUserIdentity({
  session,
}: PostHogUserIdentityProps): null {
  const posthog = usePostHog();

  useEffect(() => {
    if (!posthog) return;

    // Use anonymous ID logic
    const getOrCreateAnonymousId = () => {
      if (typeof window !== "undefined") {
        const storedId = localStorage.getItem("anon_id");
        if (storedId) {
          return storedId;
        }

        // Create a random ID using crypto API if available, fallback to Math.random
        const newId = `anon_${
          crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15)
        }`;
        localStorage.setItem("anon_id", newId);
        return newId;
      }

      return null;
    };

    const anonymousId = getOrCreateAnonymousId();

    // Always identify the user with the anonymous ID
    // Set login status as a property, not as the primary identifier
    if (anonymousId) {
      posthog.identify(anonymousId, {
        isLoggedIn: session?.isLoggedIn || false,
      });
    }
  }, [posthog, session]);

  return null;
}
