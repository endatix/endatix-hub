import { describe, it, expect } from "vitest";
import { SpanKind, TraceFlags } from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";

function createMockSpan(overrides: {
  name?: string;
  kind?: number;
  attributes?: Record<string, string>;
  traceFlags?: number;
}): ReadableSpan & { spanContext: () => { traceFlags: number } } {
  const traceFlags = overrides.traceFlags ?? TraceFlags.SAMPLED;
  const ctx = { traceFlags };
  return {
    name: overrides.name ?? "test",
    kind: overrides.kind ?? 0,
    attributes: overrides.attributes ?? {},
    spanContext: () => ctx,
    startTime: [0, 0],
    endTime: [0, 0],
    status: { code: 0 },
    resource: {} as never,
    instrumentationScope: {} as never,
    duration: [0, 0],
    ended: true,
    links: [],
    events: [],
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  } as unknown as ReadableSpan & { spanContext: () => { traceFlags: number } };
}

describe("FilteringSpanProcessor", () => {
  const processor = new FilteringSpanProcessor();

  it("marks span as not exported when http.url matches filter pattern", () => {
    const span = createMockSpan({
      attributes: { "http.url": "https://example.com/_next/static/chunk.js" },
      traceFlags: TraceFlags.SAMPLED,
    });
    const ctx = span.spanContext();

    processor.onEnd(span);

    expect(ctx.traceFlags).toBe(TraceFlags.NONE);
  });

  it("marks span as not exported when url.full contains /api/health", () => {
    const span = createMockSpan({
      attributes: { "url.full": "http://localhost:3000/api/health" },
      traceFlags: TraceFlags.SAMPLED,
    });
    const ctx = span.spanContext();

    processor.onEnd(span);

    expect(ctx.traceFlags).toBe(TraceFlags.NONE);
  });

  it("marks span as not exported for internal metric span (kind INTERNAL, name metric.*)", () => {
    const span = createMockSpan({
      name: "metric.something",
      kind: SpanKind.INTERNAL,
      traceFlags: TraceFlags.SAMPLED,
    });
    const ctx = span.spanContext();

    processor.onEnd(span);

    expect(ctx.traceFlags).toBe(TraceFlags.NONE);
  });

  it("does not mutate traceFlags when span does not match any filter", () => {
    const span = createMockSpan({
      name: "GET /api/forms",
      attributes: { "http.url": "https://example.com/api/forms" },
      traceFlags: TraceFlags.SAMPLED,
    });
    const ctx = span.spanContext();

    processor.onEnd(span);

    expect(ctx.traceFlags).toBe(TraceFlags.SAMPLED);
  });

  it("onStart is a no-op", () => {
    const span = createMockSpan({});
    expect(() => processor.onStart(span, {} as never)).not.toThrow();
  });

  it("forceFlush resolves", async () => {
    await expect(processor.forceFlush()).resolves.toBeUndefined();
  });

  it("shutdown resolves", async () => {
    await expect(processor.shutdown()).resolves.toBeUndefined();
  });
});
