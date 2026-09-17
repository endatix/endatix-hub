import { trace, Span, SpanStatusCode } from "@opentelemetry/api";

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
          span.recordException(error as Error);
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
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
