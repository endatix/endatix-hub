import { vi } from "vitest";
import { TelemetryRuntime } from "../../infrastructure/telemetry-runtime";

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
  "TELEMETRY_TRACES_PER_SECOND",
  "OTEL_EXPORTER_OTLP_INSECURE",
  "OTEL_EXPORTER_OTLP_TRACES_INSECURE",
  "OTEL_EXPORTER_OTLP_LOGS_INSECURE",
  "OTEL_TRACES_SAMPLER",
  "OTEL_TRACES_SAMPLER_ARG",
  "NEXT_MANUAL_SIG_HANDLE",
  "NEXT_OTEL_FETCH_DISABLED",
] as const;

/**
 * Stubs every telemetry env var to empty, so a developer's shell (or CI) exporting
 * OTEL_* cannot change test outcomes. Pair with `vi.unstubAllEnvs()`.
 */
export function stubEmptyTelemetryEnv(): void {
  TelemetryRuntime.reset();
  for (const key of TELEMETRY_ENV_KEYS) {
    vi.stubEnv(key, "");
  }
}
