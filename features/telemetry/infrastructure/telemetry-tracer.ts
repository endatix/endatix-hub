import { trace, Span, SpanStatusCode } from "@opentelemetry/api";
import { stringifyUnknown } from "@/lib/utils/string-utils";
import { redactSensitiveText } from "./redact-sensitive-attributes";

function toRedactedException(error: unknown): Error {
  const message = redactSensitiveText(
    error instanceof Error
      ? error.message
      : stringifyUnknown(error, { preferKey: "message" }),
  );
  const recorded = new Error(message);
  recorded.name = error instanceof Error ? error.name : "Error";
  if (error instanceof Error && error.stack) {
    recorded.stack = redactSensitiveText(error.stack);
  }
  return recorded;
}

export class TelemetryTracer {
  static getTracer(tracerName: string) {
    return trace.getTracer(tracerName);
  }

  static async traceAsync<T>(
    tracerName: string,
    spanName: string,
    fn: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.getTracer(tracerName).startActiveSpan(
      spanName,
      async (span) => {
        try {
          return await fn(span);
        } catch (error) {
          span.recordException(toRedactedException(error));
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  static trace<T>(
    tracerName: string,
    spanName: string,
    fn: (span: Span) => T,
  ): T {
    return this.getTracer(tracerName).startActiveSpan(spanName, (span) => {
      try {
        return fn(span);
      } catch (error) {
        span.recordException(toRedactedException(error));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
