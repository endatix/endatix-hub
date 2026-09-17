import { SpanKind, type Attributes } from "@opentelemetry/api";

/**
 * Request targets that carry no diagnostic value and would dominate ingestion:
 * Next.js assets, framework internals, static files and probes.
 *
 * RSC requests (`?_rsc=`) are deliberately absent: they are App Router
 * navigations that render server components and call the API, so their spans
 * and errors matter. Sampling bounds their volume, as in `@vercel/otel`, which
 * filters no Next.js request.
 */
const NOISY_TARGET_FRAGMENTS: readonly string[] = [
  "/_next/static",
  "/_next/image",
  "/_next/data",
  "/__nextjs",
  ".json",
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  "/robots.txt",
  "/sitemap",
  "/api/health",
];

/** Next.js anonymous usage telemetry; never Hub's own traffic. */
export const NEXT_TELEMETRY_HOST = "telemetry.nextjs.org";

/**
 * Whether a request target (path plus optional `?query`) is noise.
 * @param target e.g. `/_next/static/chunks/app.js` or `/api/health?probe=1`
 */
export function isNoisyRequestTarget(target: string): boolean {
  return NOISY_TARGET_FRAGMENTS.some((fragment) => target.includes(fragment));
}

function hostnameOf(url: unknown): string | undefined {
  if (typeof url !== "string" || url === "") {
    return undefined;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/** Whether a span or request targets Next.js telemetry, by exact hostname. */
export function isNextTelemetryHost(host: unknown): boolean {
  return typeof host === "string" && host.toLowerCase() === NEXT_TELEMETRY_HOST;
}

function requestTargetOf(attributes: Attributes): string {
  const path =
    attributes["url.path"] ??
    attributes["http.target"] ??
    attributes["http.route"];
  const query = attributes["url.query"];
  const target = `${path ?? ""}${query ? `?${query}` : ""}`;
  const fullUrl = attributes["url.full"] ?? attributes["http.url"];
  return [target, fullUrl].filter(Boolean).join(" ");
}

/**
 * Whether a span describes a noisy request Hub serves (asset, probe). Identifies the whole trace as noise. Covers the stable HTTP semantic
 * conventions (`url.path`, `url.query`, `url.full`) and the legacy ones
 * (`http.target`, `http.url`) Next.js still emits.
 */
export function isNoisyRequestSpan(
  name: string,
  kind: SpanKind,
  attributes: Attributes,
): boolean {
  // Asset and probe patterns describe requests Hub *serves*. An outgoing call
  // that fetches an image or a .json file is a real dependency.
  if (kind === SpanKind.CLIENT) {
    return false;
  }

  // Only request URLs identify noise. The name counts for SERVER spans alone
  // (older HTTP instrumentations name them "GET /path"); INTERNAL span names
  // such as "render route (app) /api/manifest.json" describe real work.
  const nameTarget = kind === SpanKind.SERVER ? name : "";
  return isNoisyRequestTarget(`${requestTargetOf(attributes)} ${nameTarget}`);
}

/**
 * Whether this one span is noise: a noisy request span, an internal `metric.*`
 * span, or a call to Next.js telemetry (matched by exact hostname).
 */
export function isNoisySpan(
  name: string,
  kind: SpanKind,
  attributes: Attributes,
): boolean {
  if (kind === SpanKind.INTERNAL && name.startsWith("metric.")) {
    return true;
  }

  const host =
    attributes["server.address"] ??
    attributes["net.peer.name"] ??
    hostnameOf(attributes["url.full"] ?? attributes["http.url"]);
  if (isNextTelemetryHost(host)) {
    return true;
  }

  return isNoisyRequestSpan(name, kind, attributes);
}

/**
 * Next.js wraps every request in these spans before it knows the URL. A static
 * file served by the router produces only these two, with no URL attribute.
 */
const NEXT_WRAPPER_SPAN_TYPES: ReadonlySet<string> = new Set([
  "NextServer.getRequestHandler",
  "NextServer.getServerRequestHandler",
]);

/** Whether a span is one of Next.js's URL-less request wrapper spans. */
export function isNextWrapperSpan(attributes: Attributes): boolean {
  const spanType = attributes["next.span_type"];
  return typeof spanType === "string" && NEXT_WRAPPER_SPAN_TYPES.has(spanType);
}
