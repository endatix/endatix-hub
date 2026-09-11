import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";

/** Operator switch. Does not imply a project key is present. */
export function isPostHogFlagAdapterEnabled(): boolean {
  return process.env.ENABLE_POSTHOG_ADAPTER === "true";
}

/** Resolve flags through PostHog: switch on and a non-empty `ENDATIX_POSTHOG_KEY`. */
export function shouldUsePostHogFlags(): boolean {
  return (
    isPostHogFlagAdapterEnabled() &&
    Boolean(readPublicEndatixEnv().posthogKey)
  );
}
