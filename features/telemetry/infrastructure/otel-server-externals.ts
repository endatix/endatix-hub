/**
 * Packages Next must leave unbundled so instrumentation and request handlers
 * share one `@opentelemetry/api` / `api-logs` singleton. A second copy of
 * api-logs makes TelemetryLogger.emit() a no-op while HTTP spans still export.
 */
export const OTEL_SERVER_EXTERNAL_PACKAGES = [
  "@opentelemetry/api",
  "@opentelemetry/api-logs",
  "@opentelemetry/sdk-logs",
  "@opentelemetry/sdk-node",
  "@opentelemetry/sdk-trace-node",
  "@opentelemetry/sdk-trace-base",
  "@opentelemetry/instrumentation-http",
  "@opentelemetry/instrumentation-undici",
  "@opentelemetry/exporter-trace-otlp-grpc",
  "@opentelemetry/exporter-logs-otlp-grpc",
  "@azure/monitor-opentelemetry-exporter",
] as const;
