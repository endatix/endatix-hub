import type { AttributeValue, Context } from "@opentelemetry/api";
import { TraceFlags } from "@opentelemetry/api";
import type {
  ReadableSpan,
  Span,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { redactSensitiveText } from "./redact-sensitive-attributes";
import { isNoisyRequestSpan, isNoisySpan } from "./telemetry-noise";

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

/** Upper bound on traces remembered as noise; oldest entries are evicted first. */
const MAX_TRACKED_NOISY_TRACES = 10_000;

export function shouldDrop(span: ReadableSpan): boolean {
  return isNoisySpan(span.name ?? "", span.kind, span.attributes);
}

/**
 * Last line of defence before export; must be first in the processor list.
 *
 * Noisy requests (Next.js assets, RSC payload requests, health probes) are
 * dropped for the whole trace, not one span. In a standalone Next.js server the request span
 * comes from Next.js itself (`BaseServer.handleRequest`, with `http.target`),
 * and it has wrapper parents and render children that carry no URL. A span whose
 * start attributes identify noise marks its trace, and every span of that trace
 * that ends afterwards (children and the wrapper parents) is marked unsampled so
 * no exporter after this processor sends it. `metric.*` internals and calls to
 * Next.js telemetry are dropped one span at a time.
 *
 * Secrets in URLs (storage SAS `sig`, invite and reset tokens, OAuth codes) are
 * redacted in place on every kept span, so exporters see the redacted value.
 */
export class FilteringSpanProcessor implements SpanProcessor {
  private readonly noisyTraceIds = new Set<string>();

  onStart(span: Span, _parentContext: Context): void {
    if (isNoisyRequestSpan(span.name ?? "", span.kind, span.attributes)) {
      this.rememberNoisyTrace(span.spanContext().traceId);
    }
  }

  onEnd(span: ReadableSpan): void {
    const traceId = span.spanContext().traceId;
    const noisy = this.noisyTraceIds.has(traceId) || shouldDrop(span);

    if (isLocalRoot(span)) {
      this.noisyTraceIds.delete(traceId);
    }

    if (noisy) {
      markUnsampled(span);
      return;
    }
    redactSecrets(span);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    this.noisyTraceIds.clear();
    return Promise.resolve();
  }

  private rememberNoisyTrace(traceId: string): void {
    if (this.noisyTraceIds.size >= MAX_TRACKED_NOISY_TRACES) {
      // A root span that never ends would otherwise pin its entry forever.
      const oldest = this.noisyTraceIds.values().next().value;
      if (oldest !== undefined) {
        this.noisyTraceIds.delete(oldest);
      }
    }
    this.noisyTraceIds.add(traceId);
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
