import type { Context } from "@opentelemetry/api";
import { SpanKind, TraceFlags } from "@opentelemetry/api";
import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

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

function shouldDrop(span: ReadableSpan): boolean {
  if (span.kind === SpanKind.INTERNAL && span.name.startsWith("metric.")) {
    return true;
  }
  const urlOrName = `${
    span.attributes["http.url"] ??
    span.attributes["url.full"] ??
    span.attributes["http.target"] ??
    ""
  }${span.name ?? ""}`;
  return FILTER_PATTERNS.some((pattern) => String(urlOrName).includes(pattern));
}

export class FilteringSpanProcessor implements SpanProcessor {
  onStart(_span: ReadableSpan, _parentContext: Context): void {}

  onEnd(span: ReadableSpan): void {
    if (!shouldDrop(span)) {
      return;
    }
    try {
      const ctx = span.spanContext();
      if (ctx?.traceFlags !== undefined) {
        ctx.traceFlags = TraceFlags.NONE;
      }
    } catch {
      // Immutable span context — span may still export.
    }
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
