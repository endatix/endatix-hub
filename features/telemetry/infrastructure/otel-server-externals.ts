/**
 * Packages Next must leave unbundled, so instrumentation and request handlers load
 * the same OpenTelemetry modules the SDK registered its global providers with.
 *
 * Every @opentelemetry / @azure import under features/telemetry/infrastructure must
 * be listed; otel-server-externals.test.ts fails when one is missing.
 */
export const OTEL_SERVER_EXTERNAL_PACKAGES = [
  "@opentelemetry/api",
  "@opentelemetry/api-logs",
  "@opentelemetry/context-async-hooks",
  "@opentelemetry/core",
  "@opentelemetry/resources",
  "@opentelemetry/semantic-conventions",
  "@opentelemetry/sdk-logs",
  "@opentelemetry/sdk-node",
  "@opentelemetry/sdk-trace-base",
  "@opentelemetry/sdk-trace-node",
  "@opentelemetry/instrumentation-http",
  "@opentelemetry/instrumentation-undici",
  "@opentelemetry/otlp-grpc-exporter-base",
  "@opentelemetry/exporter-trace-otlp-grpc",
  "@opentelemetry/exporter-trace-otlp-proto",
  "@opentelemetry/exporter-trace-otlp-http",
  "@opentelemetry/exporter-logs-otlp-grpc",
  "@opentelemetry/exporter-logs-otlp-proto",
  "@opentelemetry/exporter-logs-otlp-http",
  "@azure/monitor-opentelemetry-exporter",
] as const;
