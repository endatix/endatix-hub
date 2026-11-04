/**
 * Headers the host adds to every outbound API call, such as the visitor
 * address. Resolves `undefined` when it has none for this call; rejects only
 * with errors that must propagate, such as a framework control-flow error.
 */
export type OutboundHeadersProvider = () => Promise<HeadersInit | undefined>;

// On globalThis, not in module state: `next dev` evaluates a module again per
// route, so a provider registered once at startup would not reach them all.
const PROVIDER_KEY = Symbol.for("endatix.api.outbound-headers");

type ProviderHost = typeof globalThis & {
  [PROVIDER_KEY]?: OutboundHeadersProvider;
};

/**
 * Sets the provider for this process, replacing any earlier one; `undefined`
 * removes it. The Hub server registers one at startup (`instrumentation.ts`).
 * With none (the browser, scripts, e2e), calls go out unchanged.
 */
export function registerOutboundHeaders(
  provider: OutboundHeadersProvider | undefined,
): void {
  (globalThis as ProviderHost)[PROVIDER_KEY] = provider;
}

/** The registered provider's headers for this call, if any. */
export async function readOutboundHeaders(): Promise<HeadersInit | undefined> {
  const provider = (globalThis as ProviderHost)[PROVIDER_KEY];
  return provider ? provider() : undefined;
}

/**
 * Sets each outbound header on the request, replacing a value already there.
 * Leaves the request alone when there are none.
 */
export function setOutboundHeaders(
  init: RequestInit,
  outbound: HeadersInit | undefined,
): RequestInit {
  if (!outbound) {
    return init;
  }
  const headers = new Headers(init.headers);
  new Headers(outbound).forEach((value, name) => headers.set(name, value));
  return { ...init, headers };
}

/** {@link setOutboundHeaders} with the headers from {@link readOutboundHeaders}. */
export async function withOutboundHeaders(
  init: RequestInit = {},
): Promise<RequestInit> {
  return setOutboundHeaders(init, await readOutboundHeaders());
}
