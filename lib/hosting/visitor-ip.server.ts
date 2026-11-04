import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { registerOutboundHeaders } from "@/lib/endatix-api/shared/outbound-headers";
import { resolveClientIp, trustedProxiesFromEnv } from "./trusted-proxies";

/** Request header that carries the visitor address to the Endatix API. */
export const ClientIpHeaders = Object.freeze({
  FORWARDED_FOR: "X-Forwarded-For",
} as const);

/**
 * One visitor address for outbound API calls, from the request's
 * X-Forwarded-For and `ENDATIX_TRUSTED_PROXIES`.
 *
 * Next.js does not expose the socket peer, so Hub cannot check that a request
 * came through a listed proxy: set the list only when Hub is reachable solely
 * through those proxies. An empty or invalid list sends nothing.
 *
 * Returns `null` wherever `headers()` is unavailable (outside a request, inside
 * `unstable_cache` / `"use cache"`, `after()`). Rejects only with Next.js
 * control-flow errors, such as a prerender bailout, which must propagate.
 */
export async function readVisitorIp(): Promise<string | null> {
  const trusted = trustedProxiesFromEnv();
  if (!trusted || trusted.size === 0) {
    return null;
  }

  return resolveClientIp(await readForwardedFor(), trusted);
}

async function readForwardedFor(): Promise<string | null> {
  try {
    return (await headers()).get(ClientIpHeaders.FORWARDED_FOR);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/** The visitor address as outbound headers, for {@link registerOutboundHeaders}. */
export async function visitorIpHeaders(): Promise<HeadersInit | undefined> {
  const visitorIp = await readVisitorIp();
  return visitorIp ? { [ClientIpHeaders.FORWARDED_FOR]: visitorIp } : undefined;
}

/**
 * Forwards the visitor address on every outbound API call in this process.
 * Called once from `instrumentation.ts`.
 */
export function registerVisitorIpForwarding(): void {
  registerOutboundHeaders(visitorIpHeaders);
}
