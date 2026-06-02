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

- **Azure**: set `APPLICATIONINSIGHTS_CONNECTION_STRING` in the environment. The Azure Monitor OpenTelemetry distro is used; logs and exceptions are sent to App Insights. A **span filter** is applied so noisy spans (Next.js static assets, `/_next/*`, RSC payloads, `/api/health`, favicon, fonts, etc.) are not exported—reducing volume and cost. See [Filtering OpenTelemetry in Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-filter?tabs=nodejs).
- **OTLP (e.g. AWS, self-hosted)**: set `OTEL_EXPORTER_OTLP_ENDPOINT`. Logs and traces are sent to that endpoint.
- If neither is set, the telemetry SDK is not started; `TelemetryLogger` mirrors logs to the console in local development.
- Production console fallback is disabled by default to avoid duplicate logs. Set `TELEMETRY_CONSOLE_FALLBACK=true` only when the production host intentionally collects stdout/stderr.

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
| **AzureTelemetryStrategy** | `azure-telemetry-strategy.test.ts` | `useAzureMonitor` called with connection string, resource, `FilteringSpanProcessor`; throws when connection string missing |
| **OtelTelemetryStrategy** | `otel-telemetry-strategy.test.ts` | Returns SDK when OTLP endpoint set; throws when endpoint missing |
| **TelemetryInitializer** | `telemetry-initializer.test.ts` | Strategy selection (Azure vs OTel), warning when none configured, error when init throws |

OTEL APIs (`logs.getLogger`, `trace.getTracer`) are mocked so tests don’t require a running SDK.

---

## Tracing (optional)

For spans around operations, use `TelemetryTracer` from `@/features/telemetry` (e.g. `TelemetryTracer.traceAsync("feature", "operation", async (span) => { ... })`). Prefer logging for discrete events and tracer for timing and parent/child spans.
