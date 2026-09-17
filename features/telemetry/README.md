# Telemetry

OpenTelemetry-based logging and tracing for the hub. When configured (Azure App Insights or OTLP), logs and traces are exported so you can inspect them in Azure Monitor or your OTLP backend.

## Logging: use `TelemetryLogger`, not `console`

**Use `TelemetryLogger`** for all application logging so that logs (and exceptions) appear in App Insights or your OTLP endpoint. This is the single source of truth for production observability.

**Avoid `console.log` / `console.warn` / `console.error`** in application code. They only write to stdout and are not sent to Azure or OTLP. Remove them before committing, or keep them only for temporary local debugging—and strip them before merge.

---

## When to log and at which severity

| Severity     | When to use                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Debug**    | Detailed diagnostic information (e.g. variable values, flow). Often disabled or sampled in production.                                                 |
| **Info**     | Normal, expected events (e.g. "Request received", "Cache hit", "Job completed").                                                                       |
| **Warning**  | Unexpected but handled situations (e.g. fallback used, deprecated path, retry).                                                                        |
| **Error**    | Failures that are handled (e.g. validation failed, external call failed but we return a safe response).                                                |
| **Critical** | Severe failures (e.g. unhandled exception in a catch block, startup failure). Use in catch blocks and when the process or a major feature is degraded. |

---

## How to use `TelemetryLogger`

Import from the telemetry feature:

```ts
import { TelemetryLogger } from "@/features/telemetry";
```

### Basic usage

```ts
// Info (e.g. request started)
TelemetryLogger.info("Resize image request received", {}, "resize-image");

// Warning with attributes
TelemetryLogger.warn(
  "Cache miss for key",
  { key: cacheKey, ttl: 60 },
  "my-feature",
);

// Error without an Error object
TelemetryLogger.error(
  "Validation failed",
  undefined,
  { field: "email" },
  "auth",
);
```

### Errors and exceptions (for App Insights Failures)

When you have an `Error` (e.g. in a catch block), pass it as the second argument. The logger adds OTEL exception attributes and a combined message so the failure shows up correctly in Azure:

```ts
try {
  await doWork();
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  TelemetryLogger.critical(
    "Image resize failed",
    error,
    { contentType },
    "resize-image",
  );
  return apiResponses.serverError({ detail: "Image resize failed." });
}
```

- **Error/critical with `Error`**: use for catch blocks and operational failures. The message you pass is prepended to the exception message in the log body (e.g. `"Image resize failed: Invalid image format"`).
- **Logger name** (last argument): use a stable name per feature or use-case (e.g. `"resize-image"`, `"auth"`) so you can filter in App Insights.

### Signatures (quick reference)

```ts
TelemetryLogger.debug(message: string, attributes?: LogAttributes, loggerName?: string): void
TelemetryLogger.info(message: string, attributes?: LogAttributes, loggerName?: string): void
TelemetryLogger.warn(message: string, attributes?: LogAttributes, loggerName?: string): void
TelemetryLogger.error(message: string, error?: unknown, attributes?: LogAttributes, loggerName?: string): void
TelemetryLogger.critical(message: string, error?: unknown, attributes?: LogAttributes, loggerName?: string): void
```

`LogAttributes` is a record of string/number/boolean values. Avoid logging PII or secrets.

---

## Configuration

- **Azure**: set `APPLICATIONINSIGHTS_CONNECTION_STRING` at **runtime**. Azure Monitor **exporters** (not `useAzureMonitor`) run inside one `TelemetrySdk` (`NodeSDK`, which owns the tracer and logger providers). No Live Metrics or performance counters.
- **OTLP**: set `OTEL_EXPORTER_OTLP_ENDPOINT` (or a per-signal `OTEL_EXPORTER_OTLP_{TRACES,LOGS}_ENDPOINT`). `OTEL_EXPORTER_OTLP_[SIGNAL_]PROTOCOL` picks `grpc` (default), `http/protobuf` or `http/json`. Headers and TLS files are read by the exporters from the standard env vars.
- **gRPC plaintext**: `OTEL_EXPORTER_OTLP_[SIGNAL_]INSECURE=true|false` decides when set. Unset, `http://` and scheme-less `host:port` are plaintext (Hub's historical default; the OTel SDK alone would use TLS for scheme-less), `https://` is TLS.
- **Fan-out and failures**: Azure and OTLP may both be set. An exporter whose constructor throws (e.g. a malformed connection string) is logged and skipped; the others still start. Startup fails only when none can be built.
- **Sampling**: `TELEMETRY_TRACES_PER_SECOND` (`0` = no limit) → standard `OTEL_TRACES_SAMPLER` → 5 traces/s with Azure (the distro default) → keep all. A rate uses Azure Monitor's `RateLimitedSampler`, which stamps `microsoft.sample_rate` so App Insights extrapolates request/dependency counts.
- **Noise**: `HttpInstrumentation.ignoreIncomingRequestHook` skips `/_next/*`, static files, RSC payload requests (`_rsc=`), `/api/health`, robots/sitemap at the source, so they neither use the sampling budget nor create Next.js child spans. `FilteringSpanProcessor` (first processor) drops any that still arrive, plus `metric.*` internals and Next.js telemetry calls (exact host). Outgoing CLIENT spans are never dropped for their path: fetching an image is a real dependency.
- **Hub → API traces**: `UndiciInstrumentation` instruments Node `fetch` and injects `traceparent`; Next.js's own fetch span injects nothing. To avoid two `dependencies` rows per call, Hub sets `NEXT_OTEL_FETCH_DISABLED=1` at start unless it is already set.
- **Redaction**: `TelemetryLogger` redacts credential-like attribute keys before `emit` (string values only; `hasToken: true` stays). `FilteringSpanProcessor` redacts secret query params (`sig`, `token`, `code`, `X-Amz-Signature`, …) in `url.full`, `url.query`, `http.url`, `http.target`, the span name and exception events; `TelemetryTracer` redacts recorded exceptions.
- **Resource**: env, host and process detectors run once in `TelemetryInitializer`; spans and logs share the result, so `OTEL_RESOURCE_ATTRIBUTES` (e.g. `deployment.environment.name=staging`) reaches both.
- **Metrics**: none. `metricReaders: []` stops NodeSDK from adding an env-driven OTLP metric reader.
- **`OTEL_SERVICE_NAME`**, **`OTEL_SDK_DISABLED`** (`true` only, per spec). **`OTEL_LOG_LEVEL`**: SDK stdout diagnostics; leave unset in production.
- **Console**: `TelemetryRuntime` records whether a log pipeline actually started. While one runs, `TelemetryLogger` does not print. Otherwise it prints when log export was configured (start failed, or not started yet), with `TELEMETRY_CONSOLE_FALLBACK=true`, or in development. With a running exporter, `TELEMETRY_CONSOLE_FALLBACK=true` adds a one-JSON-object-per-line stdout exporter instead.
- **Process lifecycle**: telemetry never ends the process. Uncaught exceptions and unhandled rejections are logged; Next.js keeps serving. On SIGTERM/SIGINT Hub logs `Telemetry flushing on …`, flushes, and arms `ExitFlush`: Next.js's `process.exit(143|130)` after draining requests waits for a final SDK shutdown, at most `EXIT_FLUSH_TIMEOUT_MS` (5s). Before a signal, `process.exit` is untouched. After start Hub emits one `instrumentation` info log as a canary.

---

## Unit testing

Tests live in `features/telemetry/__tests__/`. Run them with:

```bash
pnpm exec vitest run features/telemetry
```

| Module                           | Test file                                  | What’s covered                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TelemetryConfig**              | `telemetry-config.test.ts`                 | Azure / OTLP detection incl. per-signal endpoints; protocol precedence and fallback; gRPC plaintext rules; `OTEL_SDK_DISABLED` spec parsing; active exporter checks; sampling precedence; console flag; service name                                                                                                                                                                                                                                          |
| **FilteringSpanProcessor**       | `filtering-span-processor.test.ts`         | Noise by stable and legacy HTTP attributes; exact Next.js telemetry host; CLIENT asset fetches kept; secret query params redacted in URL attributes, span name and exception events                                                                                                                                                                                                                                                                           |
| **TelemetryLogger**              | `telemetry-logger.test.ts`                 | Severity, body and attributes on emit; `exception.*` for errors and non-Error payloads; redaction keeps boolean diagnostics; console rules driven by `TelemetryRuntime` (running pipeline, failed start, traces-only, fallback flag, `OTEL_SDK_DISABLED`, emit failure)                                                                                                                                                                                       |
| **redactSensitiveAttributes**    | `redact-sensitive-attributes.test.ts`      | Credential-like keys redacted; booleans/numbers kept; input not mutated; `redactSensitiveText` for SAS, S3, token, OAuth code params; idempotent                                                                                                                                                                                                                                                                                                              |
| **TelemetryTracer**              | `telemetry-tracer.test.ts`                 | `getTracer`, `traceAsync`/`trace` invoke callback with span and return result; on throw, `recordException` and `setStatus` called                                                                                                                                                                                                                                                                                                                             |
| **TelemetrySdk**                 | `telemetry-sdk.test.ts`                    | Azure / OTLP / both; protocol and per-signal endpoints; a failing exporter is skipped; throws when none can be built; filter first; no metric reader; sampler selection; http + undici instrumentation with noise and Next.js-telemetry hooks; `NEXT_OTEL_FETCH_DISABLED` default; global Logs API reaches Hub's processors after `start()`; flush reaches every processor even when one fails. Instrumentations are faked so nothing patches the test worker |
| **JsonConsoleLogRecordExporter** | `json-console-log-record-exporter.test.ts` | One JSON line per record; redaction; unserializable values; stdout write failure reported, not thrown                                                                                                                                                                                                                                                                                                                                                         |
| **OTEL server externals**        | `otel-server-externals.test.ts`            | Every `@opentelemetry` / `@azure` import in `infrastructure/` is listed; wired into `next.config.ts`                                                                                                                                                                                                                                                                                                                                                          |
| **TelemetryInitializer**         | `telemetry-initializer.test.ts`            | SDK start per exporter env; `OTEL_SDK_DISABLED`; initialize/start failure leaves the log pipeline inactive; `TelemetryRuntime` marked from what started; shared detected resource; SIGTERM/SIGINT flush without exit; post-drain `process.exit` waits for shutdown; exit untouched before a signal; `NEXT_MANUAL_SIG_HANDLE`; errors logged without shutdown or exit; `ExitFlush` timeout and re-entry; `settleWithin`                                        |

`__tests__/support/telemetry-env.ts` stubs every telemetry env var to empty so a shell exporting `OTEL_*` cannot change outcomes.

Unit tests mock the OTel APIs, the Azure exporters and the instrumentations, so no test needs a running collector or patches `http` / undici.

---

## Tracing (optional)

For spans around operations, use `TelemetryTracer` from `@/features/telemetry` (e.g. `TelemetryTracer.traceAsync("feature", "operation", async (span) => { ... })`). Prefer logging for discrete events and tracer for timing and parent/child spans.
