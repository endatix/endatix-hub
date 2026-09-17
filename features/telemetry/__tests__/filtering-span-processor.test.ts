import { describe, expect, it } from "vitest";
import { SpanKind, TraceFlags, type Attributes } from "@opentelemetry/api";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
  FilteringSpanProcessor,
  shouldDrop,
} from "../infrastructure/filtering-span-processor";

type FakeSpan = ReadableSpan & { traceFlagsRef: { traceFlags: TraceFlags } };

function span(partial: {
  name?: string;
  kind?: SpanKind;
  attributes?: Attributes;
  events?: Array<{ name: string; attributes?: Attributes }>;
}): FakeSpan {
  const traceFlagsRef = { traceId: "trace", traceFlags: TraceFlags.SAMPLED };
  return {
    name: partial.name ?? "GET",
    kind: partial.kind ?? SpanKind.SERVER,
    attributes: { ...(partial.attributes ?? {}) },
    events: partial.events ?? [],
    spanContext: () => traceFlagsRef,
    traceFlagsRef,
  } as unknown as FakeSpan;
}

describe("shouldDrop", () => {
  it.each([
    [{ "url.path": "/_next/static/chunks/app.js" }],
    [{ "url.path": "/api/health" }],
    [{ "url.path": "/forms", "url.query": "_rsc=abc" }],
    [{ "url.path": "/forms", "url.query": "tab=1&_rsc=abc" }],
    [{ "http.target": "/favicon.ico" }],
    [{ "http.url": "https://hub.example.com/_next/image?url=x" }],
  ])("drops noise described by %j", (attributes) => {
    // Act & Assert
    expect(shouldDrop(span({ attributes }))).toBe(true);
  });

  it("drops internal metric spans", () => {
    // Act & Assert
    expect(
      shouldDrop(span({ name: "metric.flush", kind: SpanKind.INTERNAL })),
    ).toBe(true);
  });

  it.each([
    [{ "server.address": "telemetry.nextjs.org" }, true],
    [{ "url.full": "https://telemetry.nextjs.org/api/v1/record" }, true],
    [
      { "url.full": "https://api.example.com/?next=telemetry.nextjs.org" },
      false,
    ],
    [{ "server.address": "telemetry.nextjs.org.evil.example" }, false],
  ])(
    "matches Next.js telemetry by exact host: %j -> %s",
    (attributes, dropped) => {
      // Act & Assert
      expect(shouldDrop(span({ kind: SpanKind.CLIENT, attributes }))).toBe(
        dropped,
      );
    },
  );

  it.each([
    [{ "url.path": "/api/forms" }],
    [{ "url.path": "/forms/42", "url.query": "tab=settings" }],
  ])("keeps ordinary request spans: %j", (attributes) => {
    // Act & Assert
    expect(shouldDrop(span({ attributes }))).toBe(false);
  });

  it("keeps outgoing calls that fetch assets, which are real dependencies", () => {
    // Arrange
    const imageFetch = span({
      kind: SpanKind.CLIENT,
      attributes: {
        "url.full": "https://acct.blob.core.windows.net/c/logo.png",
      },
    });

    // Act & Assert
    expect(shouldDrop(imageFetch)).toBe(false);
  });
});

describe("FilteringSpanProcessor", () => {
  it("clears the sampled flag on dropped spans", () => {
    // Arrange
    const processor = new FilteringSpanProcessor();
    const dropped = span({ attributes: { "url.path": "/api/health" } });

    // Act
    processor.onEnd(dropped);

    // Assert
    expect(dropped.traceFlagsRef.traceFlags).toBe(TraceFlags.NONE);
  });

  it("redacts secrets in URL attributes, span name and exception events", () => {
    // Arrange
    const processor = new FilteringSpanProcessor();
    const kept = span({
      name: "GET /activate?token=invite-secret",
      kind: SpanKind.CLIENT,
      attributes: {
        "url.full":
          "https://acct.blob.core.windows.net/c/a.png?sv=2024&sig=sas-secret",
        "url.query": "token=invite-secret&tab=1",
        "http.url":
          "https://bucket.s3.amazonaws.com/a.png?X-Amz-Signature=s3-secret",
        "http.target": "/api/auth/callback?code=oauth-secret&state=xyz",
      },
      events: [
        {
          name: "exception",
          attributes: {
            "exception.message":
              "fetch failed for https://x/a.png?sig=event-secret",
            "exception.stacktrace":
              "Error: fetch failed ?sig=event-secret\n  at x",
          },
        },
      ],
    });

    // Act
    processor.onEnd(kept);

    // Assert
    const serialized = JSON.stringify({
      name: kept.name,
      attributes: kept.attributes,
      events: kept.events,
    });
    expect(serialized).not.toMatch(/secret/);
    expect(kept.attributes["url.full"]).toBe(
      "https://acct.blob.core.windows.net/c/a.png?sv=2024&sig=[REDACTED]",
    );
    expect(kept.attributes["url.query"]).toBe("token=[REDACTED]&tab=1");
    expect(kept.attributes["http.target"]).toBe(
      "/api/auth/callback?code=[REDACTED]&state=xyz",
    );
    expect(kept.traceFlagsRef.traceFlags).toBe(TraceFlags.SAMPLED);
  });

  it("resolves flush and shutdown", async () => {
    // Arrange
    const processor = new FilteringSpanProcessor();

    // Act & Assert
    await expect(processor.forceFlush()).resolves.toBeUndefined();
    await expect(processor.shutdown()).resolves.toBeUndefined();
  });
});

describe("FilteringSpanProcessor trace-level noise", () => {
  function traceSpan(partial: {
    traceId: string;
    name: string;
    kind?: SpanKind;
    attributes?: Attributes;
    parent?: { isRemote?: boolean };
  }): FakeSpan {
    const flags = { traceId: partial.traceId, traceFlags: TraceFlags.SAMPLED };
    return {
      name: partial.name,
      kind: partial.kind ?? SpanKind.INTERNAL,
      attributes: { ...(partial.attributes ?? {}) },
      events: [],
      parentSpanContext: partial.parent
        ? {
            traceId: partial.traceId,
            spanId: "p",
            traceFlags: 1,
            ...partial.parent,
          }
        : undefined,
      spanContext: () => flags,
      traceFlagsRef: flags,
    } as unknown as FakeSpan;
  }

  it("drops the children and wrapper parents of a noisy Next.js request", () => {
    // Arrange — the Next.js shape: wrapper root, request span with http.target, render child.
    const processor = new FilteringSpanProcessor();
    const root = traceSpan({
      traceId: "t1",
      name: "NextServer.getRequestHandler",
    });
    const request = traceSpan({
      traceId: "t1",
      name: "GET",
      kind: SpanKind.SERVER,
      attributes: { "http.target": "/forms?_rsc=abc" },
      parent: {},
    });
    const render = traceSpan({
      traceId: "t1",
      name: "render route (app) /forms",
      parent: {},
    });

    // Act
    processor.onStart(root as never, {} as never);
    processor.onStart(request as never, {} as never);
    processor.onStart(render as never, {} as never);
    processor.onEnd(render);
    processor.onEnd(request);
    processor.onEnd(root);

    // Assert
    for (const span of [render, request, root]) {
      expect(span.traceFlagsRef.traceFlags).toBe(TraceFlags.NONE);
    }
  });

  it("forgets a noisy trace once its local root ends", () => {
    // Arrange
    const processor = new FilteringSpanProcessor();
    const noisyRoot = traceSpan({
      traceId: "t2",
      name: "GET",
      kind: SpanKind.SERVER,
      attributes: { "http.target": "/api/health" },
    });
    processor.onStart(noisyRoot as never, {} as never);
    processor.onEnd(noisyRoot);
    const laterSpan = traceSpan({ traceId: "t2", name: "unrelated work" });

    // Act
    processor.onEnd(laterSpan);

    // Assert
    expect(laterSpan.traceFlagsRef.traceFlags).toBe(TraceFlags.SAMPLED);
  });

  it("keeps a real trace that contains a metric span or a Next.js telemetry call", () => {
    // Arrange
    const processor = new FilteringSpanProcessor();
    const request = traceSpan({
      traceId: "t3",
      name: "GET",
      kind: SpanKind.SERVER,
      attributes: { "http.target": "/forms/42" },
    });
    const metric = traceSpan({
      traceId: "t3",
      name: "metric.flush",
      parent: {},
    });
    const telemetryCall = traceSpan({
      traceId: "t3",
      name: "POST",
      kind: SpanKind.CLIENT,
      attributes: { "server.address": "telemetry.nextjs.org" },
      parent: {},
    });

    // Act
    for (const span of [request, metric, telemetryCall]) {
      processor.onStart(span as never, {} as never);
    }
    processor.onEnd(metric);
    processor.onEnd(telemetryCall);
    processor.onEnd(request);

    // Assert
    expect(metric.traceFlagsRef.traceFlags).toBe(TraceFlags.NONE);
    expect(telemetryCall.traceFlagsRef.traceFlags).toBe(TraceFlags.NONE);
    expect(request.traceFlagsRef.traceFlags).toBe(TraceFlags.SAMPLED);
  });

  it("does not treat an INTERNAL span name mentioning a file as noise", () => {
    // Arrange
    const processor = new FilteringSpanProcessor();
    const render = traceSpan({
      traceId: "t4",
      name: "executing api route (app) /api/manifest.json",
    });

    // Act
    processor.onStart(render as never, {} as never);
    processor.onEnd(render);

    // Assert
    expect(render.traceFlagsRef.traceFlags).toBe(TraceFlags.SAMPLED);
  });
});
