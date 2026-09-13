import { readPublicEndatixEnv } from "@/features/config/client-endatix-config";

export function isPostHogFlagProviderRequested(): boolean {
  return process.env.FLAG_PROVIDER === "posthog";
}

export function shouldUsePostHogFlags(): boolean {
  return (
    isPostHogFlagProviderRequested() &&
    Boolean(readPublicEndatixEnv().posthogKey)
  );
}
