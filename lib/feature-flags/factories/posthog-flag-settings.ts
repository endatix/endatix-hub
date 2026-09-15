import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";

const POSTHOG_PROVIDER = "posthog";

/** Raw `FLAG_PROVIDER`, trimmed. Empty string when unset. */
function readRequestedFlagProvider(): string {
  return process.env.FLAG_PROVIDER?.trim() ?? "";
}

/**
 * Operator asked for PostHog flags. Does not imply a project key is present.
 *
 * Trimmed before comparing: a trailing space or a `\r` from a Windows `.env` would
 * otherwise drop the deployment back to environment flags with no signal.
 */
function isPostHogFlagProviderRequested(): boolean {
  return readRequestedFlagProvider() === POSTHOG_PROVIDER;
}

export function shouldUsePostHogFlags(): boolean {
  return (
    isPostHogFlagProviderRequested() &&
    Boolean(readPublicEndatixEnv().posthogProjectToken)
  );
}
