import { trace } from "@opentelemetry/api";

/**
 * The id shown on the export error page for someone to quote in a support
 * request.
 *
 * Not a secret - a correlation id is meant to be shared - but it is rendered on
 * a branded page, so its shape is clamped rather than trusted. It arrives in the
 * URL, which anyone can edit.
 *
 * Two sources, in order. An API failure carries the API's own `traceId` through
 * problem details, which points at the request that actually failed. A timeout
 * has no API error at all, so the active trace is used instead - that is the one
 * carrying the `render-pdf` span and its workload attributes, which is what an
 * engineer needs to see why the render was slow.
 */

/** Trace ids are hex, sometimes with W3C separators. Nothing else belongs here. */
const REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function parseSupportReference(
  value: string | undefined | null,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return REFERENCE_PATTERN.test(trimmed) ? trimmed : null;
}

/** Trace id of the request in flight, when telemetry is running. */
function currentTraceId(): string | null {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext?.traceId) {
    return null;
  }

  // An all-zero id is OpenTelemetry's "no valid trace" sentinel.
  return /^0+$/.test(spanContext.traceId) ? null : spanContext.traceId;
}

/** Prefers the failing API's own id, falling back to this request's trace. */
export function resolveSupportReference(
  apiTraceId: string | undefined,
): string | null {
  return parseSupportReference(apiTraceId) ?? parseSupportReference(currentTraceId());
}
