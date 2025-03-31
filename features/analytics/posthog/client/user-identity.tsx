"use client";

import type { SessionData } from "@/features/auth";
import { useSessionIdentity } from "./hooks/use-identify";

interface PostHogUserIdentityProps {
  session?: SessionData;
}

/**
 * Component that handles user identification in PostHog
 * Uses email as identifier for logged in users, and random IDs for anonymous users
 * Handles multi-user scenarios when different users share the same device
 */
export function PostHogUserIdentity({
  session,
}: PostHogUserIdentityProps): null {
  useSessionIdentity(session);
  
  return null;
}
