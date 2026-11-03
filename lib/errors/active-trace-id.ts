import { trace } from "@opentelemetry/api";

/** Trace id of the span in flight, when telemetry is running. */
export function activeTraceId(): string | null {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext?.traceId) {
    return null;
  }

  // An all-zero id is OpenTelemetry's "no valid trace" sentinel.
  return /^0+$/.test(spanContext.traceId) ? null : spanContext.traceId;
}
