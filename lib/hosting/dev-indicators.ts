import type { NextConfig } from "next";

/**
 * Opt-in switch for the Next.js dev indicator (the floating badge in `next dev`).
 * `HUB_DEV_INDICATORS=false` hides it so screenshots and videos show the Hub as users
 * see it; any other value keeps the Next.js default. No effect outside `next dev`.
 */
export function resolveDevIndicators(
  env: Record<string, string | undefined> = process.env,
): Pick<NextConfig, "devIndicators"> {
  const hidden = env.HUB_DEV_INDICATORS?.trim().toLowerCase() === "false";
  return hidden ? { devIndicators: false } : {};
}
