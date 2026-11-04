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
  if (typeof window !== "undefined") {
    return null;
  }

  const { resolveClientIp, trustedProxiesFromEnv } =
    await import("./trusted-proxies");
  const trusted = trustedProxiesFromEnv();
  if (!trusted || trusted.size === 0) {
    return null;
  }

  return resolveClientIp(await readForwardedFor(), trusted);
}

async function readForwardedFor(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    return (await headers()).get(ClientIpHeaders.FORWARDED_FOR);
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    return null;
  }
}

/**
 * Sets the visitor address on outbound request headers, replacing any
 * forwarded chain already there. Leaves the headers alone when there is none.
 */
export function setVisitorIp(
  init: RequestInit,
  visitorIp: string | null,
): RequestInit {
  if (!visitorIp) {
    return init;
  }
  const headers = new Headers(init.headers);
  headers.set(ClientIpHeaders.FORWARDED_FOR, visitorIp);
  return { ...init, headers };
}

/** {@link setVisitorIp} with the address from {@link readVisitorIp}. */
export async function withVisitorIp(
  init: RequestInit = {},
): Promise<RequestInit> {
  return setVisitorIp(init, await readVisitorIp());
}
