import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export type OtlpSignal = "TRACES" | "LOGS";
export type OtlpProtocol = "grpc" | "http/protobuf" | "http/json";

const OTLP_PROTOCOLS: readonly OtlpProtocol[] = [
  "grpc",
  "http/protobuf",
  "http/json",
];

/**
 * Hub's default when no protocol is set. The OTel spec suggests http/protobuf, but
 * Hub shipped gRPC-only and the Endatix API also defaults to gRPC, so an existing
 * `OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317` keeps working.
 */
const DEFAULT_OTLP_PROTOCOL: OtlpProtocol = "grpc";

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

/**
 * Telemetry configuration constants
 */
export const TelemetryConfig = {
  /**
   * Service name for telemetry
   */
  SERVICE_NAME: "endatix-hub",

  /**
   * Resource attribute key for service name
   */
  ATTR_SERVICE_NAME,

  /**
   * Determine if Azure Application Insights is configured
   */
  isAzureConfigured(): boolean {
    return !!this.azureConnectionString();
  },

  /**
   * Application Insights connection string, trimmed; undefined when unset or blank.
   */
  azureConnectionString(): string | undefined {
    return readEnv("APPLICATIONINSIGHTS_CONNECTION_STRING");
  },

  /**
   * Determine if OTLP export is configured for any signal Hub exports
   */
  isOtelConfigured(): boolean {
    return (
      this.isOtlpSignalConfigured("TRACES") ||
      this.isOtlpSignalConfigured("LOGS")
    );
  },

  /**
   * Whether OTLP export is configured for one signal: the generic endpoint or
   * that signal's own endpoint (`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, …).
   */
  isOtlpSignalConfigured(signal: OtlpSignal): boolean {
    return (
      !!readEnv("OTEL_EXPORTER_OTLP_ENDPOINT") ||
      !!readEnv(`OTEL_EXPORTER_OTLP_${signal}_ENDPOINT`)
    );
  },

  /**
   * OTLP protocol for a signal: the signal-specific key, then the generic key,
   * then gRPC. An unknown value falls back to gRPC with a warning.
   */
  otlpProtocol(signal: OtlpSignal): OtlpProtocol {
    const raw =
      readEnv(`OTEL_EXPORTER_OTLP_${signal}_PROTOCOL`) ??
      readEnv("OTEL_EXPORTER_OTLP_PROTOCOL");
    if (!raw) {
      return DEFAULT_OTLP_PROTOCOL;
    }

    const protocol = raw.toLowerCase() as OtlpProtocol;
    if (OTLP_PROTOCOLS.includes(protocol)) {
      return protocol;
    }

    console.warn(
      `Unsupported OTLP protocol "${raw}" for ${signal}; using ${DEFAULT_OTLP_PROTOCOL}.`,
    );
    return DEFAULT_OTLP_PROTOCOL;
  },

  /**
   * Standard OTel kill switch. Per the SDK environment spec only `true`
   * (case-insensitive) disables — the same parsing NodeSDK uses.
   */
  isSdkDisabled(): boolean {
    return readEnv("OTEL_SDK_DISABLED")?.toLowerCase() === "true";
  },

  /**
   * Whether an exporter will actually receive TelemetryLogger records: one is
   * configured and the SDK is not disabled.
   */
  hasActiveExporter(): boolean {
    return (
      !this.isSdkDisabled() &&
      (this.isAzureConfigured() || this.isOtelConfigured())
    );
  },

  /**
   * TELEMETRY_CONSOLE_FALLBACK=true prints logs to stdout in production. Without an
   * active exporter it is TelemetryLogger's console fallback; with one it is a
   * JSON-lines console exporter on the OTel log pipeline.
   */
  isConsoleOutputForced(): boolean {
    return readEnv("TELEMETRY_CONSOLE_FALLBACK") === "true";
  },

  /**
   * Default service.name. OTEL_SERVICE_NAME wins, else endatix-hub.
   */
  serviceName(): string {
    return readEnv("OTEL_SERVICE_NAME") ?? this.SERVICE_NAME;
  },
};
