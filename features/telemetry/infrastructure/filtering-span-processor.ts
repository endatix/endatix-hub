import type { Context } from "@opentelemetry/api";
import { SpanKind, TraceFlags } from "@opentelemetry/api";
import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

/**
 * URL/name patterns that identify spans to exclude from export (Next.js and common noise).
 * Reduces App Insights volume and cost. See:
 * - https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-filter?tabs=nodejs
 * - https://ketan-chavan.medium.com/part-1-setting-up-app-insights-in-next-js-15-085b56149ceb
 */
const FILTER_PATTERNS: readonly string[] = [
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
  "?_rsc=",
  "?rsc=",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap",
  "/api/health",
  "telemetry.nextjs.org",
];

function getSpanUrlOrName(span: ReadableSpan): string {
  const url =
    span.attributes["http.url"] ??
    span.attributes["url.full"] ??
    span.attributes["http.target"] ??
    "";
  const name = span.name ?? "";
  return `${url}${name}`;
}

function shouldFilterByPattern(span: ReadableSpan): boolean {
  const urlOrName = getSpanUrlOrName(span);
  return FILTER_PATTERNS.some((p) => String(urlOrName).includes(p));
}

/**
 * Filters duplicate internal metric spans (e.g. same operation as dependency span).
 * SpanKind.INTERNAL === 1.
 */
function shouldFilterInternalMetricSpan(span: ReadableSpan): boolean {
  return span.kind === SpanKind.INTERNAL && span.name.startsWith("metric.");
}

function shouldFilterSpan(span: ReadableSpan): boolean {
  if (shouldFilterByPattern(span)) return true;
  if (shouldFilterInternalMetricSpan(span)) return true;
  return false;
}

/**
 * Marks a span so it is not exported by setting trace flags to NONE.
 * Per Microsoft Learn: "To mark spans to not be exported, set TraceFlag to DEFAULT (NONE)."
 * The span object from the SDK may expose a mutable context reference.
 */
function markSpanNotExported(span: ReadableSpan): void {
  try {
    const ctx = span.spanContext();
    if (
      ctx &&
      typeof (ctx as { traceFlags?: number }).traceFlags !== "undefined"
    ) {
      (ctx as { traceFlags: number }).traceFlags = TraceFlags.NONE;
    }
  } catch {
    // If span context is immutable or unavailable, skip; span may still be exported.
  }
}

/**
 * Span processor that drops noisy or redundant spans before export.
 * Used with Azure Monitor to reduce volume from Next.js static assets, RSC, health checks, etc.
 */
export class FilteringSpanProcessor implements SpanProcessor {
  onStart(_span: ReadableSpan, _parentContext: Context): void {
    // No-op; filtering happens in onEnd when span is complete.
  }

  onEnd(span: ReadableSpan): void {
    if (shouldFilterSpan(span)) {
      markSpanNotExported(span);
    }
  }

  async forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  async shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
