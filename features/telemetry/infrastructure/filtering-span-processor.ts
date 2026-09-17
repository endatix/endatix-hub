import type { AttributeValue, Context } from "@opentelemetry/api";
import { TraceFlags } from "@opentelemetry/api";
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { redactSensitiveText } from "./redact-sensitive-attributes";
import {
  isNextWrapperSpan,
  isNoisyRequestSpan,
  isNoisySpan,
} from "./telemetry-noise";

/** URL-bearing attributes that can carry SAS signatures or one-time tokens. */
const URL_ATTRIBUTE_KEYS = [
  "url.full",
  "url.query",
  "http.url",
  "http.target",
] as const;

const EXCEPTION_TEXT_KEYS = [
  "exception.message",
  "exception.stacktrace",
] as const;

/** Upper bound on traces tracked per set; oldest entries are evicted first. */
const MAX_TRACKED_TRACES = 10_000;

/**
 * Insertion-ordered set of trace ids with a size cap, so a root span that never
 * ends cannot pin its entry forever.
 */
class BoundedTraceSet {
  private readonly ids = new Set<string>();

  add(traceId: string): void {
    if (this.ids.has(traceId)) {
      return;
    }
    if (this.ids.size >= MAX_TRACKED_TRACES) {
      const oldest = this.ids.values().next().value;
      if (oldest !== undefined) {
        this.ids.delete(oldest);
      }
    }
    this.ids.add(traceId);
  }

  has(traceId: string): boolean {
    return this.ids.has(traceId);
  }

  delete(traceId: string): void {
    this.ids.delete(traceId);
  }

  clear(): void {
    this.ids.clear();
  }
}

export function shouldDrop(span: ReadableSpan): boolean {
  return isNoisySpan(span.name ?? "", span.kind, span.attributes);
}

/**
 * Last line of defence before export; must be first in the processor list.
 *
 * - **Noisy requests** (Next.js assets, static files, health probes) are dropped
 *   for the whole trace. In a standalone Next.js server the request span comes
 *   from Next.js (`BaseServer.handleRequest`, with `http.target`) and has wrapper
 *   parents and render children without a URL. A span whose start attributes
 *   identify noise marks its trace; every span of that trace that ends
 *   afterwards is marked unsampled, so no exporter after this processor sends it.
 * - **Wrapper-only traces**: a static file served by the Next.js router produces
 *   only the two `NextServer.*RequestHandler` wrapper spans, with no URL. A
 *   wrapper span is dropped when no other span started in its trace.
 * - `metric.*` internals and calls to Next.js telemetry are dropped one span at a
 *   time.
 *
 * Secrets in URLs (storage SAS `sig`, invite and reset tokens, OAuth codes) are
 * redacted in place on every kept span, so exporters see the redacted value.
 */
export class FilteringSpanProcessor implements SpanProcessor {
  private readonly noisyTraces = new BoundedTraceSet();
  private readonly tracesWithWork = new BoundedTraceSet();

  onStart(span: Span, _parentContext: Context): void {
    const traceId = span.spanContext().traceId;
    if (isNoisyRequestSpan(span.name ?? "", span.kind, span.attributes)) {
      this.noisyTraces.add(traceId);
    }
    if (!isNextWrapperSpan(span.attributes)) {
      this.tracesWithWork.add(traceId);
    }
  }

  onEnd(span: ReadableSpan): void {
    const traceId = span.spanContext().traceId;
    const drop =
      this.noisyTraces.has(traceId) ||
      shouldDrop(span) ||
      (isNextWrapperSpan(span.attributes) && !this.tracesWithWork.has(traceId));

    if (isLocalRoot(span)) {
      this.noisyTraces.delete(traceId);
      this.tracesWithWork.delete(traceId);
    }

    if (drop) {
      markUnsampled(span);
      return;
    }
    redactSecrets(span);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    this.noisyTraces.clear();
    this.tracesWithWork.clear();
    return Promise.resolve();
  }
}

/** The first span of this trace in this process: no parent, or a remote one. */
function isLocalRoot(span: ReadableSpan): boolean {
  const parent = span.parentSpanContext;
  return parent === undefined || parent.isRemote === true;
}

function markUnsampled(span: ReadableSpan): void {
  try {
    const context = span.spanContext();
    if (context?.traceFlags !== undefined) {
      context.traceFlags = TraceFlags.NONE;
    }
  } catch {
    // Immutable span context: the span may still export.
  }
}

function redactSecrets(span: ReadableSpan): void {
  // Ended spans reject setAttribute(); the SDK's attribute bag is still a plain
  // object, and exporters read it after this processor runs.
  const attributes = span.attributes as Record<
    string,
    AttributeValue | undefined
  >;
  for (const key of URL_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (typeof value === "string") {
      attributes[key] = redactSensitiveText(value);
    }
  }

  // Exception events recorded by instrumentations quote the failing URL.
  for (const event of span.events ?? []) {
    const eventAttributes = event.attributes as
      | Record<string, AttributeValue | undefined>
      | undefined;
    if (!eventAttributes) {
      continue;
    }
    for (const key of EXCEPTION_TEXT_KEYS) {
      const value = eventAttributes[key];
      if (typeof value === "string") {
        eventAttributes[key] = redactSensitiveText(value);
      }
    }
  }

  const redactedName = redactSensitiveText(span.name);
  if (redactedName !== span.name) {
    try {
      (span as { name: string }).name = redactedName;
    } catch {
      // Read-only name: attributes are still redacted.
    }
  }
}
