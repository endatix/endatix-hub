import { vi } from "vitest";

/** Every env var the telemetry module reads. */
export const TELEMETRY_ENV_KEYS = [
  "APPLICATIONINSIGHTS_CONNECTION_STRING",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
  "OTEL_RESOURCE_ATTRIBUTES",
  "OTEL_SDK_DISABLED",
  "OTEL_SERVICE_NAME",
  "TELEMETRY_CONSOLE_FALLBACK",
  "NEXT_MANUAL_SIG_HANDLE",
] as const;

/**
 * Stubs every telemetry env var to empty, so a developer's shell (or CI) exporting
 * OTEL_* cannot change test outcomes. Pair with `vi.unstubAllEnvs()`.
 */
export function stubEmptyTelemetryEnv(): void {
  for (const key of TELEMETRY_ENV_KEYS) {
    vi.stubEnv(key, "");
  }
}
