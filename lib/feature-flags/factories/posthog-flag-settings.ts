import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";

/** Operator asked for PostHog flags. Does not imply a project key is present. */
export function isPostHogFlagProviderRequested(): boolean {
  return process.env.FLAG_PROVIDER === "posthog";
}

/**
 * Resolve flags through PostHog: `FLAG_PROVIDER=posthog` and a non-empty
 * `POSTHOG_PROJECT_API_KEY`.
 */
export function shouldUsePostHogFlags(): boolean {
  return (
    isPostHogFlagProviderRequested() &&
    Boolean(readPublicEndatixEnv().posthogKey)
  );
}
