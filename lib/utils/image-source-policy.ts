/**
 * Decides what Hub does with an image source in author rich text
 * (`inlineRich`): load it, show it as a link, show a placeholder, or drop it.
 *
 * Pure and config-free: the caller passes the allowed hosts (computed on the
 * server in `lib/hosting`) and the Hub's own origin.
 */
export interface ImageSourcePolicy {
  /** Hostnames (optionally `host:port`) images may load from, matched exactly. */
  readonly allowedHosts: readonly string[];
  /** The Hub's own origin (e.g. `https://hub.example.com`); never an image source. */
  readonly ownOrigin?: string;
}

export type ImageSourceDecision =
  | { readonly kind: "keep"; readonly src: string }
  | { readonly kind: "link"; readonly href: string; readonly host: string }
  | { readonly kind: "too-large" }
  | { readonly kind: "drop" };

/** Largest inline image, counted in base64 characters (100 KB). */
export const MAX_DATA_IMAGE_BASE64_LENGTH = 100 * 1024;

const DATA_IMAGE =
  /^data:image\/(?:png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const IPV4_LITERAL = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const DROP: ImageSourceDecision = { kind: "drop" };

export const EMPTY_IMAGE_SOURCE_POLICY: ImageSourcePolicy = Object.freeze({
  allowedHosts: Object.freeze([]),
});

export function decideImageSource(
  rawSrc: string | undefined,
  policy: ImageSourcePolicy,
): ImageSourceDecision {
  const src = (rawSrc ?? "").trim();
  if (src.toLowerCase().startsWith("data:")) {
    return decideDataImage(src);
  }
  const url = parseUrl(src);
  if (!url || isRejectedImageUrl(url, policy)) {
    return DROP;
  }
  return isAllowedHost(url, policy.allowedHosts)
    ? { kind: "keep", src: url.href }
    : { kind: "link", href: url.href, host: url.hostname };
}

function decideDataImage(src: string): ImageSourceDecision {
  const match = DATA_IMAGE.exec(src);
  if (!match) {
    return DROP;
  }
  return match[1].length > MAX_DATA_IMAGE_BASE64_LENGTH
    ? { kind: "too-large" }
    : { kind: "keep", src };
}

function parseUrl(src: string): URL | null {
  try {
    return new URL(src);
  } catch {
    return null;
  }
}

/** Never an image source, even when listed: non-https, userinfo, IPs, localhost, the Hub itself. */
function isRejectedImageUrl(url: URL, policy: ImageSourcePolicy): boolean {
  const hostname = url.hostname.toLowerCase();
  return (
    url.protocol !== "https:" ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    hostname.startsWith("[") ||
    IPV4_LITERAL.test(hostname) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isOwnOrigin(url, policy.ownOrigin)
  );
}

function isOwnOrigin(url: URL, ownOrigin: string | undefined): boolean {
  const own = ownOrigin ? parseUrl(ownOrigin) : null;
  return (
    own !== null && own.hostname.toLowerCase() === url.hostname.toLowerCase()
  );
}

/** Exact hostname match; a pattern with a port also needs that port. */
function isAllowedHost(url: URL, allowedHosts: readonly string[]): boolean {
  const hostname = url.hostname.toLowerCase();
  const host = url.host.toLowerCase();
  return allowedHosts.some((pattern) => {
    const entry = pattern.trim().toLowerCase();
    return entry.includes(":") ? entry === host : entry === hostname;
  });
}
