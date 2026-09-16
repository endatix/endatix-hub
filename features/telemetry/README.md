# Telemetry

OpenTelemetry-based logging and tracing for the hub. When configured (Azure App Insights or OTLP), logs and traces are exported so you can inspect them in Azure Monitor or your OTLP backend.

## Logging: use `TelemetryLogger`, not `console`

**Use `TelemetryLogger`** for all application logging so that logs (and exceptions) appear in App Insights or your OTLP endpoint. This is the single source of truth for production observability.

**Avoid `console.log` / `console.warn` / `console.error`** in application code. They only write to stdout and are not sent to Azure or OTLP. Remove them before committing, or keep them only for temporary local debugging—and strip them before merge.

---

## When to log and at which severity

| Severity   | When to use |
|-----------|--------------|
| **Debug** | Detailed diagnostic information (e.g. variable values, flow). Often disabled or sampled in production. |
| **Info**  | Normal, expected events (e.g. "Request received", "Cache hit", "Job completed"). |
| **Warning** | Unexpected but handled situations (e.g. fallback used, deprecated path, retry). |
| **Error**  | Failures that are handled (e.g. validation failed, external call failed but we return a safe response). |
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
TelemetryLogger.error("Validation failed", undefined, { field: "email" }, "auth");
```

### Errors and exceptions (for App Insights Failures)

When you have an `Error` (e.g. in a catch block), pass it as the second argument. The logger adds OTEL exception attributes and a combined message so the failure shows up correctly in Azure:

```ts
try {
  await doWork();
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  TelemetryLogger.critical("Image resize failed", error, { contentType }, "resize-image");
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

- **Azure**: set `APPLICATIONINSIGHTS_CONNECTION_STRING` at **runtime**. Azure Monitor **exporters** (not `useAzureMonitor`) share one NodeSDK with an explicit `LoggerProvider` (`logs.setGlobalLoggerProvider`), matching the `@vercel/otel` logs split. Span filter still drops `/_next/*`, RSC, health, etc. No Live Metrics or performance counters (those come only with the distro).
- **OTLP**: set `OTEL_EXPORTER_OTLP_ENDPOINT` (or a per-signal `OTEL_EXPORTER_OTLP_{TRACES,LOGS}_ENDPOINT`). `OTEL_EXPORTER_OTLP_[SIGNAL_]PROTOCOL` picks `grpc` (default), `http/protobuf` or `http/json`. Headers, `_INSECURE`, `_CERTIFICATE` and client certs are read by the exporters from the standard env vars. Both Azure and OTLP may be set (fan-out).
- **Resource**: env, host and process detectors run once in `TelemetryInitializer`; spans and logs share the result, so `OTEL_RESOURCE_ATTRIBUTES` (e.g. `deployment.environment.name=staging`) reaches both.
- **Metrics**: none. NodeSDK gets empty `metricReaders` / `logRecordProcessors` so it does not build env-driven pipelines of its own.
- **`OTEL_SERVICE_NAME`**, **`OTEL_SDK_DISABLED`** (`true` only, per spec), **`OTEL_LOG_LEVEL`**: standard OTel env vars.
- If no exporter is active (none set, or `OTEL_SDK_DISABLED=true`), `TelemetryLogger` mirrors to the console in development, or in production with `TELEMETRY_CONSOLE_FALLBACK=true`.
- With an active exporter, stdout is off unless `TELEMETRY_CONSOLE_FALLBACK=true`, which adds a one-JSON-object-per-line console exporter to the log pipeline.
- **Shutdown**: on SIGTERM/SIGINT Hub only flushes; Next.js drains requests and exits.

---

## Unit testing

Tests live in `features/telemetry/__tests__/`. Run them with:

```bash
pnpm test -- --run features/telemetry
```

| Module | Test file | What’s covered |
|--------|-----------|----------------|
| **TelemetryConfig** | `telemetry-config.test.ts` | `SERVICE_NAME`, `isAzureConfigured()`, `isOtelConfigured()` with env toggles |
| **FilteringSpanProcessor** | `filtering-span-processor.test.ts` | Spans matching URL/pattern or internal metric → `traceFlags` set to NONE; non-matching span unchanged; `forceFlush`/`shutdown` |
| **TelemetryLogger** | `telemetry-logger.test.ts` | `debug`/`info`/`warn`/`error`/`critical` call OTEL logger `emit` with correct severity, body, attributes; error/critical with `Error` set `exception.*` and combined body; console fallback behavior |
| **TelemetryTracer** | `telemetry-tracer.test.ts` | `getTracer`, `traceAsync`/`trace` invoke callback with span and return result; on throw, `recordException` and `setStatus` called |
| **NodeSdkTelemetryStrategy** | `node-sdk-telemetry-strategy.test.ts` | Azure/OTLP/both; OTLP protocol selection and per-signal endpoints; no env-built metric/log pipelines; JSON stdout only when forced; undici instrumentation; throws when no exporter |
| **JsonConsoleLogRecordExporter** | `json-console-log-record-exporter.test.ts` | One JSON line per record; survives unserializable values |
| **OTEL server externals** | `otel-server-externals.test.ts` | `serverExternalPackages` includes `api-logs` |
| **TelemetryInitializer** | `telemetry-initializer.test.ts` | Strategy when Azure or OTLP set; `OTEL_SDK_DISABLED`; warning when none; error when init throws; SIGTERM flushes without exiting; detected resource includes `OTEL_RESOURCE_ATTRIBUTES` |

OTEL APIs (`logs.getLogger`, `trace.getTracer`) are mocked so tests don’t require a running SDK.

---

## Tracing (optional)

For spans around operations, use `TelemetryTracer` from `@/features/telemetry` (e.g. `TelemetryTracer.traceAsync("feature", "operation", async (span) => { ... })`). Prefer logging for discrete events and tracer for timing and parent/child spans.
